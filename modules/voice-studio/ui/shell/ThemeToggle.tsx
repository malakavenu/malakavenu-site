'use client';

/**
 * Light/Dark theme toggle.
 *
 * Reads system preference on first paint, then defers to the user's choice
 * stored in `localStorage` under `voiceStudio.theme`. Writes a `data-theme`
 * attribute to the Voice Studio root so CSS variables can switch palettes.
 */

import { useCallback, useEffect, useState } from 'react';
import styles from '../../styles/voice-studio.module.css';

const STORAGE_KEY = 'voiceStudio.theme';
type Theme = 'light' | 'dark';

function readClientPreference(): Theme {
  // Voice Studio defaults to dark regardless of the OS-level preference: the
  // studio UI is purpose-built for the dark palette (glass cards, neon
  // accents, low-contrast input fields look out of place in light mode). The
  // user can still opt-in to light mode via the toggle, in which case their
  // choice persists in `localStorage` and wins on subsequent visits.
  if (typeof window === 'undefined') return 'dark';
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // localStorage may be blocked (private mode / SSR-like contexts).
  }
  return 'dark';
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  const targets = document.querySelectorAll('[data-vs-root]');
  if (targets.length) {
    targets.forEach((el) => el.setAttribute('data-theme', theme));
  } else {
    document.documentElement.setAttribute('data-vs-theme', theme);
  }
}

interface ThemeToggleProps {
  compact?: boolean;
}

export function ThemeToggle({ compact = false }: ThemeToggleProps) {
  // SSR and first client render BOTH start from 'dark' (matches the data-theme
  // hard-coded on `<div data-vs-root data-theme="dark">`). If we lazy-init
  // from localStorage/matchMedia the client gets a different value than the
  // server and React tears down the entire subtree — including the always-
  // mounted FloatingPlayer <audio>, which silently kills any playing track.
  // The actual user preference is applied inside the post-mount effect.
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const preferred = readClientPreference();
    // setState-in-effect is unavoidable here: SSR/first-paint must use the
    // hard-coded 'dark' value (see comment on `useState` above) to avoid a
    // hydration mismatch that would tear down the always-mounted audio
    // element. The post-mount read promotes the stored preference exactly
    // once. The `if` guard skips the extra render when nothing changed.
    if (preferred !== theme) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTheme(preferred);
    }
    applyTheme(preferred);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((current) => {
      const next: Theme = current === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore quota / private-mode errors */
      }
      return next;
    });
  }, []);

  return (
    <button
      type="button"
      className={`${styles.themeToggle} ${compact ? styles.themeToggleCompact : ''}`}
      onClick={toggle}
      aria-pressed={theme === 'dark'}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span className={styles.themeToggleIcon} aria-hidden="true">
        {theme === 'dark' ? <MoonIcon /> : <SunIcon />}
      </span>
      {!compact && <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>}
    </button>
  );
}

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
