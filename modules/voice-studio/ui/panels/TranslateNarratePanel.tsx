'use client';

/**
 * Translate & Speak Panel.
 *
 * Translates with the in-browser MyMemory client (no quota), then asks the
 * narrate handler for audio in the target language. Audio publishes to the
 * shared floating player.
 */

import { useState, useCallback } from 'react';
import type { LanguageCode, Tone, VoiceStudioConfig } from '../../types';
import { getLanguagesByGroup, LANGUAGES } from '../../config';
import { translateInBrowser } from '../../client/translate';
import { useAudioContext } from '../AudioContext';
import { useHistory } from '../shared/useHistory';
import { HistoryList } from '../shared/HistoryList';
import { pickVoiceForPreset } from '../avatar/presets';
import styles from '../../styles/voice-studio.module.css';

interface TranslateNarratePanelProps {
  language: LanguageCode;
  config: VoiceStudioConfig;
}

export function TranslateNarratePanel({ language, config }: TranslateNarratePanelProps) {
  const [text, setText] = useState('');
  const [sourceLang, setSourceLang] = useState<LanguageCode>('en-IN');
  const [targetLang, setTargetLang] = useState<LanguageCode>(language);
  const [tone, setTone] = useState<Tone>('neutral');
  const [loading, setLoading] = useState(false);
  const [translatedText, setTranslatedText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [usedProvider, setUsedProvider] = useState<string | null>(null);

  const { publishTrack, avatarPreset } = useAudioContext();
  const { entries: historyEntries, addEntry, clearHistory } = useHistory('translate-speak');

  const translatableLanguages = [
    ...getLanguagesByGroup('featured').filter(([code]) => code !== 'en-US' && code !== 'mix'),
    ...getLanguagesByGroup('indic'),
  ];

  const handleTranslate = useCallback(async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setTranslatedText('');
    setUsedProvider(null);

    try {
      const translated = await translateInBrowser({ text, sourceLang, targetLang });
      setTranslatedText(translated);

      const narrateForm = new FormData();
      narrateForm.append('text', translated);
      narrateForm.append('language', targetLang);
      narrateForm.append('tone', tone);
      // Pass an avatar-gender-matching voice hint so the male / female
      // avatar's mouth isn't visually paired with the opposite-gender voice.
      // resolveEdgeVoice() on the server picks the right Edge-TTS neural
      // voice from the hint (or 'male'/'female' keyword inside it).
      const targetVoices = LANGUAGES[targetLang]?.voices ?? [];
      const voiceHint =
        pickVoiceForPreset(targetVoices, avatarPreset) || avatarPreset.gender;
      narrateForm.append('voice', voiceHint);

      const narrateRes = await fetch(`${config.apiBasePath}/narrate`, {
        method: 'POST',
        body: narrateForm,
      });

      if (narrateRes.ok) {
        const provider = narrateRes.headers.get('x-vs-provider-used') ?? 'edge-tts';
        const blob = await narrateRes.blob();
        const url = URL.createObjectURL(blob);
        publishTrack({
          url,
          title: translated.slice(0, 80),
          provider: `mymemory → ${provider}`,
          panel: 'translate-speak',
          caption: translated.slice(0, 140),
        });
        addEntry({
          panel: 'translate-speak',
          language: targetLang,
          text: translated,
          audioUrl: url,
          provider,
        });
        setUsedProvider(`mymemory → ${provider}`);
      } else {
        setUsedProvider('mymemory (translation only)');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [text, sourceLang, targetLang, tone, config.apiBasePath, publishTrack, addEntry, avatarPreset]);

  return (
    <section
      className={styles.panel}
      role="tabpanel"
      id="panel-translate-speak"
      aria-labelledby="tab-translate-speak"
    >
      <h2 className={styles.panelTitle}>Translate &amp; Speak</h2>
      <p className={styles.panelDesc}>
        Translate between Indian languages and hear the result spoken aloud. Powered
        by MyMemory (browser, no quota) + Edge TTS.
      </p>

      <div className={styles.bento}>
        <div className={`${styles.card} ${styles.cardWide}`}>
          <div className={styles.cardHeader}>
            <span className={styles.cardStep}>1</span>
            <h3 className={styles.cardTitle}>Language pair</h3>
          </div>
          <div className={styles.controlRow}>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="translate-source">From</label>
              <select
                id="translate-source"
                className={styles.select}
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value as LanguageCode)}
              >
                {translatableLanguages.map(([code, entry]) => (
                  <option key={code} value={code}>{entry.label}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className={styles.swapBtn}
              onClick={() => {
                setSourceLang(targetLang);
                setTargetLang(sourceLang);
              }}
              aria-label="Swap languages"
            >
              ⇄
            </button>

            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="translate-target">To</label>
              <select
                id="translate-target"
                className={styles.select}
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value as LanguageCode)}
              >
                {translatableLanguages.map(([code, entry]) => (
                  <option key={code} value={code}>{entry.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className={`${styles.card} ${styles.cardWide}`}>
          <div className={styles.cardHeader}>
            <span className={styles.cardStep}>2</span>
            <h3 className={styles.cardTitle}>Text to translate</h3>
          </div>
          <textarea
            id="translate-text"
            className={styles.textarea}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type or paste text to translate…"
            rows={4}
          />
          <div className={styles.controlRow}>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="translate-tone">Narration tone</label>
              <select
                id="translate-tone"
                className={styles.select}
                value={tone}
                onChange={(e) => setTone(e.target.value as Tone)}
              >
                <option value="neutral">Neutral</option>
                <option value="warm">Warm</option>
                <option value="calm">Calm</option>
                <option value="energetic">Energetic</option>
              </select>
            </div>
          </div>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={handleTranslate}
            disabled={loading || !text.trim()}
          >
            {loading ? 'Translating…' : 'Translate & speak'}
          </button>
          {usedProvider && <p className={styles.providerBadge}>{usedProvider}</p>}
          {error && <p className={styles.error} role="alert">{error}</p>}
        </div>

        {translatedText && (
          <div className={`${styles.card} ${styles.cardWide}`}>
            <div className={styles.cardHeader}>
              <span className={styles.cardStep}>3</span>
              <h3 className={styles.cardTitle}>Translation</h3>
            </div>
            <div className={styles.translationResult}>
              <p className={styles.translatedText}>{translatedText}</p>
            </div>
          </div>
        )}
      </div>

      <HistoryList
        entries={historyEntries}
        onPlay={(entry) =>
          publishTrack({
            url: entry.audioUrl,
            title: entry.text.slice(0, 80),
            provider: entry.provider,
            panel: 'translate-speak',
          })
        }
        onClear={clearHistory}
      />
    </section>
  );
}
