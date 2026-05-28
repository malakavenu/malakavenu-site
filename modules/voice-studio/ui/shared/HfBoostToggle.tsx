'use client';

/**
 * HF Boost Toggle — header switch for enabling HF Spaces (higher quality, quota-limited).
 * Persists to localStorage. Sends X-VS-HF-Boost header on all API calls.
 */

import { useState, useEffect, useCallback } from 'react';
import styles from '../../styles/voice-studio.module.css';

const STORAGE_KEY = 'voiceStudio.hfBoost';

function readStored(defaultValue: boolean): boolean {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? defaultValue : stored === '1';
  } catch {
    return defaultValue;
  }
}

interface HfBoostToggleProps {
  configDefault?: boolean;
}

export function HfBoostToggle({ configDefault = false }: HfBoostToggleProps) {
  const [enabled, setEnabled] = useState<boolean>(() => readStored(configDefault));

  const toggle = useCallback(() => {
    setEnabled((current) => {
      const next = !current;
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        /* ignore quota errors */
      }
      return next;
    });
  }, []);

  return (
    <button
      type="button"
      className={`${styles.boostToggle} ${enabled ? styles.boostToggleOn : ''}`}
      onClick={toggle}
      title={enabled
        ? 'HF Boost ON — Higher quality via Hugging Face (quota-limited). Click to disable.'
        : 'HF Boost OFF — Using free unlimited providers. Click to enable HF quality boost.'}
      aria-pressed={enabled}
    >
      <span className={styles.boostIcon}>🚀</span>
      <span className={styles.boostLabel}>HF Boost</span>
      <span className={styles.boostState}>{enabled ? 'ON' : 'OFF'}</span>
    </button>
  );
}

/**
 * Hook to read the current HF Boost state from localStorage.
 * Initial value is read synchronously via a lazy initializer; subsequent
 * changes from other tabs are synchronised via the `storage` event.
 */
export function useHfBoost(): boolean {
  const [enabled, setEnabled] = useState<boolean>(() => readStored(false));

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => setEnabled(readStored(false));
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  return enabled;
}
