'use client';

/**
 * HeroStage — the visual centerpiece at the top of the main canvas.
 *
 * Composition:
 *   - `<SpeakingAvatar mode="stage" />` on the left (or stacked on mobile).
 *   - Title + current panel + live caption on the right.
 *   - An audio-reactive bar visualizer that pulses with the active track.
 *
 * Caption + title come from the active track in `useAudioContext` when audio is
 * playing, otherwise from the panel's idle copy.
 */

import { Suspense, lazy, useEffect, useRef, useState, useCallback } from 'react';
import { useAudioContext } from '../AudioContext';
import type { LanguageCode, PanelId } from '../../types';
import styles from '../../styles/voice-studio.module.css';

const SpeakingAvatar = lazy(() =>
  import('../avatar/SpeakingAvatar').then((m) => ({ default: m.SpeakingAvatar }))
);

interface HeroStageProps {
  activePanel: PanelId;
  language: LanguageCode;
}

const PANEL_TITLES: Record<PanelId, string> = {
  'news-reader': 'News reader',
  'voice-clone': 'Voice clone',
  'voice-convert': 'Voice convert',
  'translate-speak': 'Translate & speak',
};

const PANEL_DESCRIPTIONS: Record<PanelId, string> = {
  'news-reader': 'Edge TTS · neural · zero quota',
  'voice-clone': 'Browser Chatterbox · OpenVoice fallback',
  'voice-convert': 'OpenVoice V2 · zero-shot',
  'translate-speak': 'MyMemory · client-side',
};

export function HeroStage({ activePanel, language }: HeroStageProps) {
  const { activeTrack, setHeroElement } = useAudioContext();
  // Register the hero <section> with the shared context so `publishTrack`
  // can scroll it back into view when a new clip starts while the user is
  // scrolled down on a panel.
  const heroRef = useCallback(
    (el: HTMLElement | null) => {
      setHeroElement(el);
    },
    [setHeroElement]
  );

  return (
    <section ref={heroRef} className={styles.hero}>
      <div className={styles.heroAvatar}>
        <Suspense fallback={<div className={styles.heroAvatarSkeleton} />}>
          <SpeakingAvatar
            mode="stage"
            caption={activeTrack?.caption}
          />
        </Suspense>
      </div>

      <div className={styles.heroCopy}>
        <div className={styles.heroLangChip}>
          <span className={styles.heroLangDot} />
          <span className={styles.heroLangText}>{language}</span>
        </div>
        <h1 className={styles.heroTitle}>
          <span className={styles.heroTitleAccent}>{PANEL_TITLES[activePanel]}</span>
        </h1>
        <p className={styles.heroSubtitle}>{PANEL_DESCRIPTIONS[activePanel]}</p>

        <HeroWaveform />

        {activeTrack?.caption && (
          <p className={styles.heroCaption} aria-live="polite">
            “{activeTrack.caption}”
          </p>
        )}
      </div>
    </section>
  );
}

// ─── Hero waveform — pure-CSS bar visualizer driven by audio.volume ────────

const BAR_COUNT = 28;

// Deterministic phase offsets per bar — keeps render pure (no Math.random in
// the component body) while still giving the visualizer a natural look.
const BAR_PHASES: number[] = Array.from(
  { length: BAR_COUNT },
  (_, i) => ((i * 1.6180339887) % 1) * Math.PI * 2
);

function HeroWaveform() {
  const { audioRef } = useAudioContext();
  const barsRef = useRef<HTMLDivElement>(null);
  const phasesRef = useRef<number[]>(BAR_PHASES);
  const [active, setActive] = useState(false);

  useEffect(() => {
    // We can't tap the AudioContext (wawa-lipsync owns it on the same element),
    // so instead poll `currentTime`/`paused` and the element's `.volume` proxy.
    const root = barsRef.current;
    if (!root) return;

    let raf: number;
    let lastTime = 0;
    const loop = () => {
      const el = audioRef.current;
      const playing = !!el && !el.paused && !el.ended && el.currentTime > 0;
      setActive(playing);

      const t = performance.now() / 1000;
      const phases = phasesRef.current;
      // Use a low-frequency base + bar-specific phase so bars dance even when
      // we don't have direct PCM access. When idle, gently sway with low amp.
      const base = playing ? 0.55 + 0.45 * Math.sin(t * 4) : 0.22;
      // Estimate "energy" from playback velocity (rough but lively).
      const energy = playing ? Math.min(1, Math.abs(el!.currentTime - lastTime) * 10) : 0;
      lastTime = el?.currentTime ?? 0;

      for (let i = 0; i < BAR_COUNT; i++) {
        const phase = phases[i] + t * (1.2 + (i % 5) * 0.3);
        const sin = Math.sin(phase);
        const wave = playing
          ? 0.18 + Math.abs(sin) * 0.6 + energy * 0.35
          : 0.12 + Math.abs(sin) * 0.18;
        const height = Math.min(1, wave * base * 1.4);
        (root.children[i] as HTMLElement)?.style.setProperty(
          '--bar-height',
          `${(height * 100).toFixed(1)}%`
        );
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [audioRef]);

  return (
    <div
      ref={barsRef}
      className={`${styles.heroWave} ${active ? styles.heroWaveActive : ''}`}
      aria-hidden="true"
    >
      {Array.from({ length: BAR_COUNT }).map((_, i) => (
        <span key={i} className={styles.heroWaveBar} />
      ))}
    </div>
  );
}
