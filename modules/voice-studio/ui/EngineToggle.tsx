'use client';

/**
 * IndicF5 ↔ Praxy R6 toggle.
 * Only shown for te-IN and ta-IN in the Voice Clone panel.
 */

import type { Engine, LanguageCode } from '../types';
import styles from '../styles/voice-studio.module.css';

interface EngineToggleProps {
  value: Engine;
  onChange: (engine: Engine) => void;
  language: LanguageCode;
}

export function EngineToggle({ value, onChange, language }: EngineToggleProps) {
  const langName = language === 'te-IN' ? 'Telugu' : 'Tamil';

  return (
    <div className={styles.engineToggle} role="group" aria-label="Clone engine selection">
      <span className={styles.engineLabel}>Engine:</span>
      <button
        type="button"
        role="radio"
        aria-checked={value === 'indicf5'}
        className={`${styles.engineBtn} ${value === 'indicf5' ? styles.engineBtnActive : ''}`}
        onClick={() => onChange('indicf5')}
      >
        IndicF5
        <span className={styles.engineBadge}>Default</span>
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={value === 'praxy-r6'}
        className={`${styles.engineBtn} ${value === 'praxy-r6' ? styles.engineBtnActive : ''}`}
        onClick={() => onChange('praxy-r6')}
      >
        Praxy R6
        <span className={styles.engineBadge}>Experimental</span>
      </button>
      <p className={styles.engineHint}>
        Praxy R6 has lower retroflex collapse for {langName} — try both and compare with A/B player.
      </p>
    </div>
  );
}
