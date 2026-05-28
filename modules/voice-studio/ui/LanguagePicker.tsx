'use client';

/**
 * Two-tier language picker:
 * 1. Featured chips (top row) — en-IN, te-IN, mix, en-US
 * 2. Grouped dropdown — Indic (20) + Browser (8)
 */

import { useState, useRef, useEffect } from 'react';
import type { LanguageCode, VoiceStudioConfig } from '../types';
import { LANGUAGES, getLanguagesByGroup } from '../config';
import styles from '../styles/voice-studio.module.css';

interface LanguagePickerProps {
  value: LanguageCode;
  onChange: (lang: LanguageCode) => void;
  config: VoiceStudioConfig;
}

export function LanguagePicker({ value, onChange, config }: LanguagePickerProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const featuredLangs = config.featuredLanguages;
  const isFeatured = featuredLangs.includes(value);

  return (
    <div className={styles.languagePicker} role="group" aria-label="Language selection">
      {/* Featured chips */}
      <div className={styles.featuredChips} role="radiogroup" aria-label="Featured languages">
        {featuredLangs.map((code) => {
          const entry = LANGUAGES[code];
          if (!entry) return null;
          return (
            <button
              key={code}
              type="button"
              role="radio"
              aria-checked={value === code}
              className={`${styles.chip} ${value === code ? styles.chipActive : ''}`}
              onClick={() => {
                onChange(code);
                setDropdownOpen(false);
              }}
            >
              {entry.label}
            </button>
          );
        })}

        {/* "More" button for dropdown */}
        <div className={styles.dropdownWrapper} ref={dropdownRef}>
          <button
            type="button"
            className={`${styles.chip} ${!isFeatured ? styles.chipActive : ''}`}
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-expanded={dropdownOpen}
            aria-haspopup="listbox"
          >
            {!isFeatured ? LANGUAGES[value]?.label ?? 'More…' : 'More…'}
            <span className={styles.chevron} aria-hidden="true">▾</span>
          </button>

          {dropdownOpen && (
            <div className={styles.dropdown} role="listbox" aria-label="All languages">
              {config.enabledGroups.includes('indic') && (
                <LanguageGroup
                  label="Indic Languages"
                  languages={getLanguagesByGroup('indic')}
                  selected={value}
                  onSelect={(code) => {
                    onChange(code);
                    setDropdownOpen(false);
                  }}
                />
              )}
              {config.enabledGroups.includes('browser') && (
                <LanguageGroup
                  label="Browser (Kokoro)"
                  languages={getLanguagesByGroup('browser')}
                  selected={value}
                  onSelect={(code) => {
                    onChange(code);
                    setDropdownOpen(false);
                  }}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

interface LanguageGroupProps {
  label: string;
  languages: [LanguageCode, { label: string }][];
  selected: LanguageCode;
  onSelect: (code: LanguageCode) => void;
}

function LanguageGroup({ label, languages, selected, onSelect }: LanguageGroupProps) {
  return (
    <div className={styles.dropdownGroup}>
      <div className={styles.dropdownGroupLabel}>{label}</div>
      {languages.map(([code, entry]) => (
        <button
          key={code}
          type="button"
          role="option"
          aria-selected={selected === code}
          className={`${styles.dropdownItem} ${selected === code ? styles.dropdownItemActive : ''}`}
          onClick={() => onSelect(code)}
        >
          {entry.label}
        </button>
      ))}
    </div>
  );
}
