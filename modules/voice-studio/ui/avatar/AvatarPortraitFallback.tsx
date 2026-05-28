'use client';

/**
 * Audio-reactive portrait fallback for the speaking avatar.
 *
 * Renders the brand-tinted `AnimatedFace` SVG — a purpose-built lip-syncing
 * face whose mouth ellipse actually opens, closes, and reshapes based on the
 * analyser's volume + dominant viseme. Used in two scenarios:
 *
 *   1. As a load skeleton while the 3D RPM `.glb` streams in.
 *   2. As the permanent fallback when WebGL is disabled, the GLB fails to
 *      load, or the user explicitly disables 3D.
 *
 * The animated face renders inside a pulse ring + soft glow so the speaking
 * state reads loud and clear even at thumbnail sizes.
 */

import { useEffect, useRef } from 'react';
import { AnimatedFace } from './AnimatedFace';
import type { VisemeName } from './useLipsync';
import styles from '../../styles/avatar.module.css';

interface AvatarPortraitFallbackProps {
  /** Used as the deterministic seed for the AnimatedFace palette */
  seed: string;
  /** Volume polling source — drives mouth gape + ring pulse */
  getVolume?: () => number;
  /** Dominant viseme polling source — drives mouth shape (E vs O vs U …) */
  getViseme?: () => VisemeName;
  /** Size variant — stage is large, widget is small */
  size?: 'stage' | 'widget' | 'expanded';
  /** Optional caption shown under the portrait */
  caption?: string;
  /**
   * Preset gender — forwarded to AnimatedFace so male presets render with
   * short hair / beard / muted lips, and females with long hair / lipstick.
   * Without it a "Kai" 2D portrait could pop up with long hair + lipstick.
   */
  gender?: 'female' | 'male' | 'neutral';
}

const SIZE_PX: Record<'stage' | 'widget' | 'expanded', number> = {
  widget: 140,
  stage: 280,
  expanded: 420,
};

export function AvatarPortraitFallback({
  seed,
  getVolume,
  getViseme,
  size = 'stage',
  caption,
  gender = 'neutral',
}: AvatarPortraitFallbackProps) {
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!getVolume) return;
    let raf: number;
    const loop = () => {
      const v = Math.min(1, Math.max(0, getVolume()));
      if (ringRef.current) {
        ringRef.current.style.setProperty('--audio-volume', v.toFixed(3));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [getVolume]);

  const px = SIZE_PX[size];

  // `aspect-ratio: 1/1` + `width: min(px, 100%)` keeps the portrait perfectly
  // round when the parent flex container is narrower than `px` (common on
  // mobile expanded mode). Setting only width/height in pixels lets flex
  // shrink the WIDTH while leaving HEIGHT at full px — which renders the
  // ring + glow as a tall ellipse instead of a circle.
  return (
    <div
      className={`${styles.portraitWrap} ${styles[`portraitWrap_${size}`] ?? ''}`}
      style={{ width: `min(${px}px, 100%)`, aspectRatio: '1 / 1' }}
    >
      <div ref={ringRef} className={styles.portraitRing} aria-hidden="true" />
      <div className={styles.portraitGlow} aria-hidden="true" />
      <div className={styles.portrait}>
        <AnimatedFace
          seed={seed}
          getVolume={getVolume ?? (() => 0)}
          getViseme={getViseme}
          size={Math.floor(px * 0.86)}
          gender={gender}
        />
      </div>
      {caption && <div className={styles.portraitCaption}>{caption}</div>}
    </div>
  );
}
