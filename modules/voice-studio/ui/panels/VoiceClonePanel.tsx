'use client';

/**
 * Voice Clone Panel.
 *
 * Flow:
 *  1. POST to /api/clone.
 *  2. If the server runs a clone provider (e.g. IndicF5 or OpenVoice V2), it
 *     returns an audio blob directly.
 *  3. If the server returns `{ mode: 'browser', provider }`, we lazy-load the
 *     matching in-browser engine (`chatterbox-browser` → Chatterbox Multilingual,
 *     `f5-browser` → F5-TTS English), show a model-download progress modal on
 *     first use, then run inference locally.
 *  4. Only if the browser engine itself errors do we fall back to Edge-TTS
 *     narration — clearly labelled as "narration, not cloning".
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { Engine, LanguageCode, VoiceSample, VoiceStudioConfig } from '../../types';
import { transcribe } from '../../client/asr';
import { VoiceSamplePicker } from '../shared/VoiceSamplePicker';
import { ConsentGate, useCloneConsent } from '../shared/ConsentGate';
import { useAudioContext } from '../AudioContext';
import { useHistory } from '../shared/useHistory';
import { HistoryList } from '../shared/HistoryList';
import {
  ModelDownloadProgress,
  type ModelDownloadState,
} from '../shared/ModelDownloadProgress';
import styles from '../../styles/voice-studio.module.css';

interface VoiceClonePanelProps {
  language: LanguageCode;
  engine: Engine;
  config: VoiceStudioConfig;
}

type BrowserEngine = 'chatterbox' | 'f5-en';

function pickBrowserEngine(serverProvider: string, language: LanguageCode): BrowserEngine {
  if (serverProvider === 'f5-browser') return 'f5-en';
  if (serverProvider === 'chatterbox-browser') return 'chatterbox';
  // Default by language
  return language.startsWith('en-') ? 'f5-en' : 'chatterbox';
}

export function VoiceClonePanel({ language, engine, config }: VoiceClonePanelProps) {
  const [text, setText] = useState('');
  const [sample, setSample] = useState<VoiceSample | null>(null);
  const [transcript, setTranscript] = useState('');
  const [transcribing, setTranscribing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usedProvider, setUsedProvider] = useState<string | null>(null);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [downloadModel, setDownloadModel] = useState<string>('');
  const [downloadSize, setDownloadSize] = useState<string>('');
  const [downloadState, setDownloadState] = useState<ModelDownloadState | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { publishTrack } = useAudioContext();
  const { entries: historyEntries, addEntry, clearHistory } = useHistory('voice-clone');

  const publish = useCallback(
    (url: string, provider: string) => {
      publishTrack({
        url,
        title: text.trim().slice(0, 80) || 'Cloned voice',
        provider,
        panel: 'voice-clone',
        caption: text.trim().slice(0, 140),
      });
      addEntry({ panel: 'voice-clone', language, text, audioUrl: url, provider });
      setUsedProvider(provider);
    },
    [publishTrack, addEntry, language, text]
  );

  const { hasConsented, showGate, requestConsent, grantConsent, declineConsent } = useCloneConsent();

  useEffect(() => {
    if (!sample || !sample.audioUrl) return;
    let cancelled = false;

    // Preset samples ship with a transcript — apply it asynchronously to
    // keep this effect free of synchronous setState (React-compiler friendly).
    if (sample.source === 'preset' && sample.transcript) {
      const presetTranscript = sample.transcript;
      const handle = setTimeout(() => {
        if (!cancelled) setTranscript(presetTranscript);
      }, 0);
      return () => {
        cancelled = true;
        clearTimeout(handle);
      };
    }

    // Defer the "transcribing" indicator + kick-off into a microtask so we
    // never call setState synchronously inside the effect body.
    queueMicrotask(() => {
      if (cancelled) return;
      setTranscribing(true);
      const audioInput = sample.audioBlob ?? sample.audioUrl!;
      transcribe(audioInput, language.split('-')[0])
        .then((result) => {
          if (!cancelled) setTranscript(result.text);
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setTranscribing(false);
        });
    });

    return () => {
      cancelled = true;
    };
  }, [sample, language]);

  /** Run a browser-side clone engine. Shows the progress modal on first use. */
  const runBrowserClone = useCallback(
    async (
      browserEngine: BrowserEngine,
      params: { text: string; refAudio: Blob; refTranscript: string; language: LanguageCode }
    ): Promise<Blob> => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      const { signal } = abortRef.current;

      const isChatterbox = browserEngine === 'chatterbox';
      setDownloadModel(isChatterbox ? 'Chatterbox Multilingual' : 'F5-TTS English');
      setDownloadSize(isChatterbox ? '~1.5 GB' : '~200 MB');
      setDownloadState({ fraction: 0, loaded: 0, status: 'Initialising…' });
      setDownloadOpen(true);

      try {
        if (isChatterbox) {
          const { cloneWithChatterbox, isChatterboxLoaded } = await import(
            '../../client/chatterbox'
          );
          if (isChatterboxLoaded()) {
            setDownloadState({ fraction: 1, loaded: 0, status: 'Generating speech…' });
          }
          const result = await cloneWithChatterbox(
            { ...params, language: params.language },
            {
              onProgress: (p) =>
                setDownloadState({
                  fraction: p.fraction,
                  loaded: p.loaded,
                  total: p.total,
                  file: p.file,
                  status: p.status,
                }),
              signal,
            }
          );
          return result.blob;
        } else {
          const { cloneWithF5, isF5Loaded } = await import('../../client/f5-tts');
          if (isF5Loaded()) {
            setDownloadState({ fraction: 1, loaded: 0, status: 'Generating speech…' });
          }
          const result = await cloneWithF5(
            { text: params.text, refAudio: params.refAudio, refTranscript: params.refTranscript },
            {
              onProgress: (p) =>
                setDownloadState({
                  fraction: p.fraction,
                  loaded: p.loaded,
                  total: p.total,
                  file: p.file,
                  status: p.status,
                }),
              signal,
            }
          );
          return result.blob;
        }
      } finally {
        setDownloadOpen(false);
      }
    },
    []
  );

  /** Fallback: use Edge TTS to narrate the text (NOT cloning, but always works). */
  const fallbackToEdgeTts = useCallback(
    async (textToSpeak: string, lang: string) => {
      const formData = new FormData();
      formData.append('text', textToSpeak);
      formData.append('language', lang);
      formData.append('tone', 'warm');

      const res = await fetch(`${config.apiBasePath}/narrate`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Narration fallback failed');
      const blob = await res.blob();
      publish(URL.createObjectURL(blob), 'edge-tts (narration only — clone failed)');
    },
    [config.apiBasePath, publish]
  );

  const handleGenerate = useCallback(async () => {
    if (!text.trim() || !sample || !transcript.trim()) return;
    if (!hasConsented) {
      requestConsent();
      return;
    }

    setLoading(true);
    setError(null);
    setUsedProvider(null);

    try {
      const formData = new FormData();
      formData.append('text', text);
      formData.append('language', language);
      formData.append('referenceTranscript', transcript);
      formData.append('engine', engine);

      if (sample.audioBlob) {
        formData.append('referenceAudio', sample.audioBlob);
      } else if (sample.audioUrl) {
        const resp = await fetch(sample.audioUrl);
        formData.append('referenceAudio', await resp.blob());
      }

      const response = await fetch(`${config.apiBasePath}/clone`, {
        method: 'POST',
        body: formData,
      });

      const provider = response.headers.get('x-vs-provider-used');
      const contentType = response.headers.get('content-type') ?? '';

      if (contentType.includes('application/json')) {
        const data = await response.json();
        if (data.mode === 'browser') {
          const browserEngine = pickBrowserEngine(data.provider ?? provider ?? '', language);
          const refBlob = sample.audioBlob
            ? sample.audioBlob
            : await (await fetch(sample.audioUrl!)).blob();

          try {
            const blob = await runBrowserClone(browserEngine, {
              text,
              refAudio: refBlob,
              refTranscript: transcript,
              language,
            });
            publish(
              URL.createObjectURL(blob),
              `${browserEngine === 'chatterbox' ? 'chatterbox' : 'f5-tts'} (browser)`
            );
            return;
          } catch (browserErr) {
            await fallbackToEdgeTts(text, language);
            setError(
              `In-browser clone failed (${
                browserErr instanceof Error ? browserErr.message : 'unknown'
              }). Played stock TTS narration instead.`
            );
            return;
          }
        }
        if (data.error) throw new Error(data.error);
      }

      if (!response.ok) {
        throw new Error('Clone failed');
      }

      const blob = await response.blob();
      publish(URL.createObjectURL(blob), provider ?? 'server');
    } catch (err) {
      try {
        await fallbackToEdgeTts(text, language);
        setError(
          `Clone failed (${
            err instanceof Error ? err.message : 'unknown'
          }). Played stock TTS narration instead.`
        );
      } catch {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      }
    } finally {
      setLoading(false);
    }
  }, [text, sample, transcript, language, engine, hasConsented, requestConsent, config.apiBasePath, runBrowserClone, publish, fallbackToEdgeTts]);

  const handleCancelDownload = useCallback(() => {
    abortRef.current?.abort();
    setDownloadOpen(false);
    setLoading(false);
  }, []);

  return (
    <section className={styles.panel} role="tabpanel" id="panel-voice-clone" aria-labelledby="tab-voice-clone">
      {showGate && <ConsentGate onConsent={grantConsent} onDecline={declineConsent} />}

      <ModelDownloadProgress
        open={downloadOpen}
        modelName={downloadModel}
        approxSize={downloadSize}
        state={downloadState}
        onCancel={handleCancelDownload}
      />

      <h2 className={styles.panelTitle}>Voice Clone</h2>
      <p className={styles.panelDesc}>
        Clone a voice from a short reference. Indic languages use Chatterbox Multilingual
        in-browser; English uses F5-TTS or OpenVoice on the server. First-time browser
        downloads are cached &mdash; instant after that.
      </p>

      <div className={styles.bento}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardStep}>1</span>
            <h3 className={styles.cardTitle}>Reference voice</h3>
          </div>
          <VoiceSamplePicker language={language} onSampleSelected={setSample} currentSample={sample} />
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardStep}>2</span>
            <h3 className={styles.cardTitle}>Reference transcript</h3>
          </div>
          <div className={styles.transcriptField}>
            <textarea
              className={styles.textarea}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Transcript of the reference audio (auto-filled by Whisper)…"
              rows={2}
              aria-label="Reference audio transcript"
            />
            {transcribing && <span className={styles.transcribingBadge}>Transcribing…</span>}
          </div>
        </div>

        <div className={`${styles.card} ${styles.cardWide}`}>
          <div className={styles.cardHeader}>
            <span className={styles.cardStep}>3</span>
            <h3 className={styles.cardTitle}>Text to speak in this voice</h3>
          </div>
          <textarea
            className={styles.textarea}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              language === 'te-IN'
                ? 'ఈ గొంతుతో చెప్పాలనుకునే టెక్స్ట్ ఇక్కడ రాయండి...'
                : 'Type what you want this voice to say…'
            }
            rows={4}
            aria-label="Text to synthesise"
          />
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={handleGenerate}
            disabled={loading || !text.trim() || !sample || !transcript.trim()}
          >
            {loading ? 'Generating…' : 'Clone voice'}
          </button>
          {usedProvider && <p className={styles.providerBadge}>{usedProvider}</p>}
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
        </div>
      </div>

      <HistoryList
        entries={historyEntries}
        onPlay={(entry) =>
          publishTrack({
            url: entry.audioUrl,
            title: entry.text.slice(0, 80),
            provider: entry.provider,
            panel: 'voice-clone',
          })
        }
        onClear={clearHistory}
      />
    </section>
  );
}
