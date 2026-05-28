'use client';

/**
 * News Reader Panel — Text-to-Speech.
 *
 * Uses Edge TTS / Indic Parler-TTS (server) for Indic languages or Kokoro
 * (browser) for international languages. Publishes the generated audio to the
 * shared FloatingPlayer instead of rendering its own inline player.
 */

import { useState, useCallback, useEffect } from 'react';
import type { LanguageCode, Tone, VoiceStudioConfig } from '../../types';
import { LANGUAGES } from '../../config';
import { synthesiseWithKokoro } from '../../client/kokoro';
import { useAudioContext } from '../AudioContext';
import { useHistory } from '../shared/useHistory';
import { HistoryList } from '../shared/HistoryList';
import {
  detectVoiceGender,
  pickVoiceForPreset,
  tagVoicesByGender,
} from '../avatar/presets';
import styles from '../../styles/voice-studio.module.css';

const GENDER_SYMBOL: Record<'female' | 'male' | 'neutral', string> = {
  female: '\u2640', // ♀
  male: '\u2642',   // ♂
  neutral: '',
};

interface NewsReaderPanelProps {
  language: LanguageCode;
  config: VoiceStudioConfig;
}

const TONES: Tone[] = ['neutral', 'warm', 'energetic', 'calm', 'authoritative', 'conversational'];

export function NewsReaderPanel({ language, config }: NewsReaderPanelProps) {
  const [text, setText] = useState('');
  const [voice, setVoice] = useState('');
  const [tone, setTone] = useState<Tone>('neutral');
  const [loading, setLoading] = useState(false);
  const { publishTrack, avatarPreset } = useAudioContext();
  const { entries: historyEntries, addEntry, clearHistory } = useHistory('news-reader');
  const [error, setError] = useState<string | null>(null);
  const [lastProvider, setLastProvider] = useState<string | null>(null);

  const langEntry = LANGUAGES[language];
  const voices = langEntry?.voices ?? [];
  const isBrowser = langEntry?.newsReader.kind === 'browser';

  // ─── Avatar ↔ voice gender pairing ──────────────────────────────────────
  // When the user switches avatar (Aria → Kai, for example), nudge the voice
  // dropdown to a gender-matching option so a male avatar never gets stuck
  // mouthing a female voice (the user's "uncanny mismatch" complaint).
  //
  // We respect explicit user choice: if the current voice already matches
  // the new avatar's gender, we leave it. Only auto-switch when it doesn't.
  useEffect(() => {
    if (!voices.length) return;
    const wanted = avatarPreset.gender;
    if (wanted === 'neutral') return;
    const currentMatches = voice ? detectVoiceGender(voice) === wanted : false;
    if (currentMatches) return;
    const picked = pickVoiceForPreset(voices, avatarPreset);
    if (picked && picked !== voice) setVoice(picked);
    // Intentionally exclude `voice` from deps — we only re-bind when avatar
    // or language changes, otherwise the user can never manually override.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatarPreset.id, avatarPreset.gender, language]);

  const taggedVoices = tagVoicesByGender(voices);

  const publish = useCallback(
    (url: string, provider: string) => {
      const title = text.trim().slice(0, 80) || 'Narration';
      publishTrack({ url, title, provider, panel: 'news-reader', caption: text.trim().slice(0, 140) });
      addEntry({ panel: 'news-reader', language, text, audioUrl: url, provider });
      setLastProvider(provider);
    },
    [text, publishTrack, addEntry, language]
  );

  const handleGenerate = useCallback(async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);

    try {
      if (isBrowser) {
        const blob = await synthesiseWithKokoro({
          text,
          voice: voice || undefined,
          langCode:
            langEntry?.newsReader.kind === 'browser' ? langEntry.newsReader.langCode : undefined,
        });
        publish(URL.createObjectURL(blob), 'kokoro');
      } else {
        const formData = new FormData();
        formData.append('text', text);
        formData.append('language', language);
        if (voice) formData.append('voice', voice);
        formData.append('tone', tone);

        const response = await fetch(`${config.apiBasePath}/narrate`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const err = await response.json();
          if (err.code === 'QUOTA_EXHAUSTED' || response.status === 429) {
            setError('GPU quota reached. Switching to Edge TTS automatically.');
          }
          throw new Error(err.error ?? 'Failed to generate audio');
        }

        const provider = response.headers.get('x-vs-provider-used') ?? 'edge-tts';
        const blob = await response.blob();
        publish(URL.createObjectURL(blob), provider);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [text, voice, tone, language, isBrowser, langEntry, config.apiBasePath, publish]);

  return (
    <section className={styles.panel} role="tabpanel" id="panel-news-reader" aria-labelledby="tab-news-reader">
      <h2 className={styles.panelTitle}>News Reader</h2>
      <p className={styles.panelDesc}>
        {isBrowser
          ? 'Fast in-browser TTS powered by Kokoro-82M. No server, no quota.'
          : 'Indian-accent narration via Edge TTS (free, unlimited) with optional HF Parler-TTS boost.'}
      </p>

      <div className={styles.bento}>
        <div className={`${styles.card} ${styles.cardWide}`}>
          <div className={styles.cardHeader}>
            <span className={styles.cardStep}>1</span>
            <h3 className={styles.cardTitle}>Text to narrate</h3>
          </div>
          <textarea
            id="narrate-text"
            className={styles.textarea}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              language === 'te-IN'
                ? 'తెలుగులో టెక్స్ట్ ఇక్కడ టైప్ చేయండి...'
                : 'Type or paste your text here…'
            }
            rows={6}
          />
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardStep}>2</span>
            <h3 className={styles.cardTitle}>Voice & tone</h3>
          </div>

          <div className={styles.controlRow}>
            {voices.length > 0 && (
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="narrate-voice">
                  Voice
                  <span className={styles.voiceHintTag}>
                    matches {avatarPreset.name} ({GENDER_SYMBOL[avatarPreset.gender]})
                  </span>
                </label>
                <select
                  id="narrate-voice"
                  className={styles.select}
                  value={voice}
                  onChange={(e) => setVoice(e.target.value)}
                >
                  <option value="">Auto (match avatar)</option>
                  {taggedVoices.map((v) => (
                    <option key={v.value} value={v.value}>
                      {v.label}
                      {GENDER_SYMBOL[v.gender] && `  ${GENDER_SYMBOL[v.gender]}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {!isBrowser && (
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="narrate-tone">Tone</label>
                <select
                  id="narrate-tone"
                  className={styles.select}
                  value={tone}
                  onChange={(e) => setTone(e.target.value as Tone)}
                >
                  {TONES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardStep}>3</span>
            <h3 className={styles.cardTitle}>Generate</h3>
          </div>
          <p className={styles.panelDesc} style={{ marginBottom: '0.6rem' }}>
            Audio appears in the floating player below.
          </p>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={handleGenerate}
            disabled={loading || !text.trim()}
          >
            {loading ? 'Generating…' : 'Generate narration'}
          </button>
          {lastProvider && <p className={styles.providerBadge}>{lastProvider}</p>}
          {error && <p className={styles.error} role="alert">{error}</p>}
        </div>
      </div>

      <HistoryList
        entries={historyEntries}
        onPlay={(entry) =>
          publishTrack({
            url: entry.audioUrl,
            title: entry.text.slice(0, 80),
            provider: entry.provider,
            panel: 'news-reader',
          })
        }
        onClear={clearHistory}
      />
    </section>
  );
}
