'use client';

/**
 * Space Status — discreet, click-to-expand health chip.
 *
 * Lives in the sidebar footer (and a compact pill on mobile). Shows a single
 * green/amber/red dot and a short label; clicking opens a popover with the
 * full per-service grid + wake-up links. This replaces the chunky banner that
 * used to dominate the top of the main canvas.
 *
 * The hook (`useSpaceStatus`) is unchanged — it still polls HF Spaces and is
 * the source of truth for the dot color.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import styles from '../../styles/voice-studio.module.css';

export type SpaceState = 'checking' | 'online' | 'waking' | 'offline';

export interface SpaceInfo {
  slug: string;
  label: string;
  state: SpaceState;
}

const SPACES: Array<{ slug: string; label: string; url: string }> = [
  { slug: 'ai4bharat/indic-parler-tts', label: 'Indic TTS', url: 'https://huggingface.co/spaces/ai4bharat/indic-parler-tts' },
  { slug: 'ai4bharat/IndicF5', label: 'Voice Clone (official)', url: 'https://huggingface.co/spaces/ai4bharat/IndicF5' },
  { slug: 'Asswin04310/IndicF5', label: 'Voice Clone (fork)', url: 'https://huggingface.co/spaces/Asswin04310/IndicF5' },
  { slug: 'Plachta/Seed-VC', label: 'Voice Convert', url: 'https://huggingface.co/spaces/Plachta/Seed-VC' },
  { slug: 'ai4bharat/IndicTrans3-beta', label: 'Translation', url: 'https://huggingface.co/spaces/ai4bharat/IndicTrans3-beta' },
];

async function checkSpace(slug: string): Promise<SpaceState> {
  try {
    const res = await fetch(`https://huggingface.co/api/spaces/${slug}`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return 'offline';
    const data = await res.json();
    const stage = (data?.runtime?.stage as string | undefined) ?? '';
    if (stage === 'RUNNING') return 'online';
    if (['SLEEPING', 'BUILDING', 'STARTING', 'PAUSED'].includes(stage)) return 'waking';
    return 'offline';
  } catch {
    return 'offline';
  }
}

export function useSpaceStatus() {
  const [spaces, setSpaces] = useState<SpaceInfo[]>(
    SPACES.map((s) => ({ ...s, state: 'checking' as SpaceState }))
  );

  const refresh = useCallback(() => {
    SPACES.forEach((space, i) => {
      checkSpace(space.slug).then((state) => {
        setSpaces((prev) => {
          const next = [...prev];
          next[i] = { ...next[i], state };
          return next;
        });
      });
    });
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 60_000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { spaces, refresh };
}

interface SpaceStatusProps {
  spaces: SpaceInfo[];
  onRefresh: () => void;
  /** Compact: 22-px dot only (sidebar collapsed). Default shows label too. */
  compact?: boolean;
}

export function SpaceStatus({ spaces, onRefresh, compact = false }: SpaceStatusProps) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const allOnline = spaces.every((s) => s.state === 'online');
  const anyOffline = spaces.some((s) => s.state === 'offline');
  const checking = spaces.every((s) => s.state === 'checking');

  const tone: 'online' | 'waking' | 'offline' | 'checking' = checking
    ? 'checking'
    : allOnline
      ? 'online'
      : anyOffline
        ? 'offline'
        : 'waking';

  const shortLabel =
    tone === 'online'
      ? 'All systems go'
      : tone === 'checking'
        ? 'Checking…'
        : tone === 'offline'
          ? 'Some services sleeping'
          : 'Waking services';

  return (
    <div className={styles.spaceChipWrap} ref={popoverRef}>
      <button
        type="button"
        className={`${styles.spaceChip} ${compact ? styles.spaceChipCompact : ''} ${styles[`spaceChip_${tone}`] ?? ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Backend status: ${shortLabel}`}
        title={shortLabel}
      >
        <span className={`${styles.statusDot} ${styles[`statusDot_${tone}`]}`} aria-hidden="true" />
        {!compact && <span className={styles.spaceChipLabel}>{shortLabel}</span>}
      </button>

      {open && (
        <div className={styles.spacePopover} role="dialog" aria-label="Backend service status">
          <div className={styles.spacePopoverHeader}>
            <span className={styles.spacePopoverTitle}>Backend status</span>
            <button
              type="button"
              className={styles.spaceRefreshBtn}
              onClick={(e) => {
                e.stopPropagation();
                onRefresh();
              }}
              aria-label="Refresh status"
              title="Refresh"
            >
              ↻
            </button>
          </div>

          <ul className={styles.spacePopoverList}>
            {spaces.map((space, i) => (
              <li key={space.slug} className={styles.spacePopoverItem}>
                <span
                  className={`${styles.statusDot} ${styles[`statusDot_${space.state}`]}`}
                  aria-hidden="true"
                />
                <span className={styles.spacePopoverName}>{space.label}</span>
                <span className={styles.spacePopoverState}>
                  {space.state === 'online' && 'Online'}
                  {space.state === 'waking' && (
                    <a
                      href={SPACES[i].url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.wakeLink}
                    >
                      Wake →
                    </a>
                  )}
                  {space.state === 'offline' && (
                    <a
                      href={SPACES[i].url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.wakeLink}
                    >
                      Restart →
                    </a>
                  )}
                  {space.state === 'checking' && '…'}
                </span>
              </li>
            ))}
          </ul>

          <p className={styles.spacePopoverHint}>
            Free open-source HF Spaces. They sleep after 30 min — Voice Studio
            always falls back to the in-browser engine, so generation never blocks.
          </p>
        </div>
      )}
    </div>
  );
}
