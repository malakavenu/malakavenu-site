'use client';

/**
 * Voice sample picker — Upload | Mic | Preset
 * Provides the reference audio + transcript that IndicF5/Praxy require.
 */

import { useState, useCallback } from 'react';
import type { LanguageCode, VoiceSample } from '../../types';
import { LANGUAGES } from '../../config';
import { MicRecorder } from './MicRecorder';
import styles from '../../styles/voice-studio.module.css';

interface VoiceSamplePickerProps {
  language: LanguageCode;
  onSampleSelected: (sample: VoiceSample) => void;
  currentSample: VoiceSample | null;
}

type SourceTab = 'upload' | 'mic' | 'preset';

export function VoiceSamplePicker({
  language,
  onSampleSelected,
  currentSample,
}: VoiceSamplePickerProps) {
  const [activeTab, setActiveTab] = useState<SourceTab>('preset');

  const voices = LANGUAGES[language]?.voices ?? [];

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const sample: VoiceSample = {
        id: `upload-${Date.now()}`,
        source: 'upload',
        audioBlob: file,
        audioUrl: URL.createObjectURL(file),
        transcript: '', // Will be auto-filled by Whisper
        language,
      };
      onSampleSelected(sample);
    },
    [language, onSampleSelected]
  );

  const handleRecorded = useCallback(
    (blob: Blob, durationSec: number) => {
      const sample: VoiceSample = {
        id: `mic-${Date.now()}`,
        source: 'mic',
        audioBlob: blob,
        audioUrl: URL.createObjectURL(blob),
        transcript: '', // Will be auto-filled by Whisper
        language,
        durationSec,
      };
      onSampleSelected(sample);
    },
    [language, onSampleSelected]
  );

  const handlePresetSelect = useCallback(
    (voiceName: string) => {
      const sample: VoiceSample = {
        id: `preset-${voiceName}`,
        source: 'preset',
        audioUrl: `/modules/voice-studio/assets/samples/${language}-${voiceName.toLowerCase()}.wav`,
        transcript: '', // Loaded from manifest
        language,
      };
      onSampleSelected(sample);
    },
    [language, onSampleSelected]
  );

  return (
    <div className={styles.samplePicker}>
      <div className={styles.sampleTabs} role="tablist" aria-label="Voice sample source">
        {(['preset', 'upload', 'mic'] as SourceTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            className={`${styles.sampleTab} ${activeTab === tab ? styles.sampleTabActive : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'preset' ? '🎭 Preset' : tab === 'upload' ? '📁 Upload' : '🎙 Record'}
          </button>
        ))}
      </div>

      <div className={styles.sampleContent}>
        {activeTab === 'preset' && (
          <div className={styles.presetGrid}>
            {voices.length > 0 ? (
              voices.map((voice) => (
                <button
                  key={voice}
                  type="button"
                  className={`${styles.presetBtn} ${
                    currentSample?.id === `preset-${voice}` ? styles.presetBtnActive : ''
                  }`}
                  onClick={() => handlePresetSelect(voice)}
                >
                  {voice}
                </button>
              ))
            ) : (
              <p className={styles.noPresets}>No preset voices for this language. Upload or record instead.</p>
            )}
          </div>
        )}

        {activeTab === 'upload' && (
          <div className={styles.uploadArea}>
            <label className={styles.uploadLabel}>
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className={styles.uploadInput}
              />
              <span>Drop audio file or click to browse</span>
              <span className={styles.uploadHint}>WAV or MP3, 5–15 seconds</span>
            </label>
          </div>
        )}

        {activeTab === 'mic' && (
          <MicRecorder onRecorded={handleRecorded} maxDurationSec={15} />
        )}
      </div>

      {currentSample && (
        <div className={styles.samplePreview}>
          <span className={styles.sampleBadge}>
            {currentSample.source === 'preset' ? '🎭' : currentSample.source === 'upload' ? '📁' : '🎙'}
            {' '}{currentSample.id}
          </span>
        </div>
      )}
    </div>
  );
}
