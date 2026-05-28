'use client';

/**
 * Voice Convert Panel — Speech-to-Speech.
 *
 * Strategy:
 *  1. POST to /api/convert. If HF Boost is on (and quota left), Seed-VC runs.
 *  2. If server returns `{ mode: 'browser' }`, fall back to a free local pipeline:
 *     - Whisper transcribes the source.
 *     - Edge TTS re-narrates the transcript (this is "narration", not true VC,
 *       but it's the only fully-free path).
 *  3. Audio publishes to the floating player.
 */

import { useState, useCallback } from 'react';
import type { VoiceStudioConfig } from '../../types';
import { transcribe } from '../../client/asr';
import { MicRecorder } from '../shared/MicRecorder';
import { useAudioContext } from '../AudioContext';
import { useHistory } from '../shared/useHistory';
import { HistoryList } from '../shared/HistoryList';
import styles from '../../styles/voice-studio.module.css';

interface VoiceConvertPanelProps {
  config: VoiceStudioConfig;
}

export function VoiceConvertPanel({ config }: VoiceConvertPanelProps) {
  const [sourceAudio, setSourceAudio] = useState<Blob | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [referenceAudio, setReferenceAudio] = useState<Blob | null>(null);
  const [referenceUrl, setReferenceUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [usedProvider, setUsedProvider] = useState<string | null>(null);
  const { publishTrack } = useAudioContext();
  const { entries: historyEntries, addEntry, clearHistory } = useHistory('voice-convert');

  const handleSourceFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setSourceAudio(file); setSourceUrl(URL.createObjectURL(file)); }
  };
  const handleSourceRecorded = (blob: Blob) => {
    setSourceAudio(blob); setSourceUrl(URL.createObjectURL(blob));
  };
  const handleReferenceFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setReferenceAudio(file); setReferenceUrl(URL.createObjectURL(file)); }
  };
  const handleReferenceRecorded = (blob: Blob) => {
    setReferenceAudio(blob); setReferenceUrl(URL.createObjectURL(blob));
  };

  const publish = useCallback(
    (url: string, provider: string) => {
      publishTrack({
        url,
        title: 'Converted voice',
        provider,
        panel: 'voice-convert',
      });
      addEntry({
        panel: 'voice-convert',
        language: 'en-IN',
        text: '[voice conversion]',
        audioUrl: url,
        provider,
      });
      setUsedProvider(provider);
    },
    [publishTrack, addEntry]
  );

  const fallbackTranscribeAndNarrate = useCallback(async () => {
    if (!sourceAudio) throw new Error('No source audio');
    setStatus('Transcribing source audio…');
    const result = await transcribe(sourceAudio);
    if (!result.text.trim()) {
      throw new Error('Could not transcribe source audio. Try a clearer recording.');
    }

    setStatus('Re-narrating with new voice…');
    const formData = new FormData();
    formData.append('text', result.text);
    formData.append('language', 'en-IN');
    formData.append('tone', 'neutral');

    const res = await fetch(`${config.apiBasePath}/narrate`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Narration failed');
    const blob = await res.blob();
    publish(URL.createObjectURL(blob), 'edge-tts (transcribe + re-narrate)');
  }, [sourceAudio, config.apiBasePath, publish]);

  const handleConvert = useCallback(async () => {
    if (!sourceAudio || !referenceAudio) return;
    setLoading(true);
    setError(null);
    setStatus('');
    setUsedProvider(null);

    try {
      const formData = new FormData();
      formData.append('sourceAudio', sourceAudio);
      formData.append('referenceAudio', referenceAudio);

      const response = await fetch(`${config.apiBasePath}/convert`, {
        method: 'POST',
        body: formData,
      });

      const provider = response.headers.get('x-vs-provider-used');
      const contentType = response.headers.get('content-type') ?? '';

      if (contentType.includes('application/json')) {
        const data = await response.json();
        if (data.mode === 'browser' || data.code === 'QUOTA_EXHAUSTED') {
          await fallbackTranscribeAndNarrate();
          return;
        }
        if (data.error) throw new Error(data.error);
      }

      if (!response.ok) throw new Error('Conversion failed');

      const blob = await response.blob();
      publish(URL.createObjectURL(blob), provider ?? 'seed-vc');
    } catch (err) {
      try {
        await fallbackTranscribeAndNarrate();
      } catch {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      }
    } finally {
      setLoading(false);
      setStatus('');
    }
  }, [sourceAudio, referenceAudio, config.apiBasePath, fallbackTranscribeAndNarrate, publish]);

  return (
    <section className={styles.panel} role="tabpanel" id="panel-voice-convert" aria-labelledby="tab-voice-convert">
      <h2 className={styles.panelTitle}>Voice Convert</h2>
      <p className={styles.panelDesc}>
        Convert speech to a different voice. AI conversion when available, else free
        transcribe + re-narrate.
      </p>

      <div className={styles.bento}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardStep}>1</span>
            <h3 className={styles.cardTitle}>Source audio</h3>
          </div>
          <p className={styles.panelDesc} style={{ marginBottom: '0.8rem' }}>
            What the speaker is saying.
          </p>
          <div className={styles.audioInputGroup}>
            <label className={styles.uploadLabel}>
              <input type="file" accept="audio/*" onChange={handleSourceFile} className={styles.uploadInput} />
              <span>Upload</span>
            </label>
            <span className={styles.orDivider}>or</span>
            <MicRecorder onRecorded={handleSourceRecorded} maxDurationSec={30} />
          </div>
          {sourceUrl && (
            <audio
              controls
              src={sourceUrl}
              aria-label="Source audio preview"
              className={styles.inlineAudio}
            />
          )}
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardStep}>2</span>
            <h3 className={styles.cardTitle}>Reference voice</h3>
          </div>
          <p className={styles.panelDesc} style={{ marginBottom: '0.8rem' }}>
            Who the output should sound like.
          </p>
          <div className={styles.audioInputGroup}>
            <label className={styles.uploadLabel}>
              <input type="file" accept="audio/*" onChange={handleReferenceFile} className={styles.uploadInput} />
              <span>Upload</span>
            </label>
            <span className={styles.orDivider}>or</span>
            <MicRecorder onRecorded={handleReferenceRecorded} maxDurationSec={15} />
          </div>
          {referenceUrl && (
            <audio
              controls
              src={referenceUrl}
              aria-label="Reference voice preview"
              className={styles.inlineAudio}
            />
          )}
        </div>

        <div className={`${styles.card} ${styles.cardWide}`}>
          <div className={styles.cardHeader}>
            <span className={styles.cardStep}>3</span>
            <h3 className={styles.cardTitle}>Convert</h3>
          </div>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={handleConvert}
            disabled={loading || !sourceAudio || !referenceAudio}
          >
            {loading ? (status || 'Converting…') : 'Convert voice'}
          </button>
          {usedProvider && <p className={styles.providerBadge}>{usedProvider}</p>}
          {error && <p className={styles.error} role="alert">{error}</p>}
        </div>
      </div>

      <HistoryList
        entries={historyEntries}
        onPlay={(entry) =>
          publishTrack({
            url: entry.audioUrl,
            title: entry.text.slice(0, 80) || 'Conversion',
            provider: entry.provider,
            panel: 'voice-convert',
          })
        }
        onClear={clearHistory}
      />
    </section>
  );
}
