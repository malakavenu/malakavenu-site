'use client';

/**
 * SpeakingStage — the hero-mode wrapper around the speaking avatar.
 *
 * Provides the studio-artistic theatrical layout:
 *   - Orbital glow ring (CSS-only, themed)
 *   - Audio-reactive "ON AIR" pulse ring that swells with volume
 *   - Inline avatar preset strip with a 2D / 3D switch + "Expand" CTA
 *   - The actual avatar canvas slot is rendered by the parent
 *
 * Used in `HeroStage` and as the modal body when expanded.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AVATAR_PRESETS, type AvatarPreset } from './presets';
import styles from '../../styles/avatar.module.css';

interface SpeakingStageProps {
  children: ReactNode;
  /** Returns current normalised volume 0..1 (drives the ON AIR ring) */
  getVolume?: () => number;
  /** Current avatar preset */
  preset: AvatarPreset;
  onSelectPreset: (preset: AvatarPreset) => void;
  /** Toggle 3D vs portrait fallback */
  use3D: boolean;
  onToggle3D: (next: boolean) => void;
  /** Whether a usable 3D model is available for the active preset. When
   *  false the toggle is rendered disabled with a helpful tooltip. */
  canUse3D: boolean;
  /** Open the theatrical modal */
  onExpand: () => void;
  /** Optional caption shown beneath the avatar */
  caption?: string;
  /** Visual size — `stage` (hero) or `expanded` (modal) */
  size?: 'stage' | 'expanded';
}

export function SpeakingStage({
  children,
  getVolume,
  preset,
  onSelectPreset,
  use3D,
  onToggle3D,
  canUse3D,
  onExpand,
  caption,
  size = 'stage',
}: SpeakingStageProps) {
  const ringRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!getVolume) return;
    let raf: number;
    const loop = () => {
      const v = Math.min(1, Math.max(0, getVolume()));
      if (ringRef.current) {
        ringRef.current.style.setProperty('--audio-volume', v.toFixed(3));
      }
      setActive(v > 0.04);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [getVolume]);

  return (
    <div className={`${styles.stage} ${styles[`stage_${size}`] ?? ''}`}>
      <div ref={ringRef} className={styles.stageRing} aria-hidden="true" />
      <div className={styles.stageGlow} aria-hidden="true" />

      <div className={styles.stageBadgeRow}>
        <span
          className={`${styles.onAir} ${active ? styles.onAirActive : ''}`}
          aria-live="polite"
        >
          <span className={styles.onAirDot} />
          {active ? 'On air' : 'Standby'}
        </span>
        {size === 'stage' && (
          <button
            type="button"
            className={styles.stageExpandBtn}
            onClick={onExpand}
            aria-label="Expand avatar to full screen"
          >
            <ExpandIcon />
            <span>Expand</span>
          </button>
        )}
      </div>

      <div className={styles.stageCanvas}>{children}</div>

      {caption && <div className={styles.stageCaption}>{caption}</div>}

      <div className={styles.stageDock}>
        <div className={styles.stagePresets}>
          {AVATAR_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelectPreset(p)}
              className={`${styles.stagePreset} ${
                p.id === preset.id ? styles.stagePresetActive : ''
              }`}
              title={`${p.name} — ${p.tag}`}
              aria-label={`${p.name} (${p.gender}) — ${p.tag}`}
              aria-pressed={p.id === preset.id}
              data-preset-id={p.id}
            >
              <span className={styles.stagePresetGender} aria-hidden="true">
                {p.gender === 'female' ? '♀' : p.gender === 'male' ? '♂' : '◇'}
              </span>
              <span>{p.name}</span>
            </button>
          ))}
        </div>

        <label
          className={`${styles.stage3dToggle} ${!canUse3D ? styles.stage3dToggleDisabled : ''}`}
          title={
            canUse3D
              ? '3D avatar with lip-sync'
              : 'Run `npm run voice-studio:avatars` to enable the 3D model. Portrait mode is fully functional in the meantime.'
          }
        >
          <input
            type="checkbox"
            checked={use3D}
            onChange={(e) => onToggle3D(e.target.checked)}
            disabled={!canUse3D}
          />
          <span className={styles.stage3dTrack}>
            <span className={styles.stage3dThumb} />
          </span>
          <span className={styles.stage3dLabel}>3D</span>
        </label>
      </div>
    </div>
  );
}

function ExpandIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 3h6v6" />
      <path d="M9 21H3v-6" />
      <path d="M21 3l-7 7" />
      <path d="M3 21l7-7" />
    </svg>
  );
}
