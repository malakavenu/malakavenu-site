'use client';

/**
 * React hook wrapping `wawa-lipsync`'s `Lipsync` class.
 *
 * Connects an `HTMLAudioElement` to a real-time viseme detector and exposes:
 *  - `visemes`  — 15-element Float32 array (one per Oculus viseme)
 *  - `volume`   — current normalised volume (0..1)
 *  - `idle`     — true when no audio activity for >250 ms (drives blink/breath anims)
 *
 * Important: the underlying `Lipsync` instantiates its own `AudioContext` and
 * routes the audio element through its analyser to `destination`. Do not double-
 * connect the same audio element to a separate AudioContext or playback will
 * fail silently.
 */

import { useRef, useEffect, useCallback } from 'react';

export const OCULUS_VISEMES = [
  'viseme_sil', 'viseme_PP', 'viseme_FF', 'viseme_TH',
  'viseme_DD', 'viseme_kk', 'viseme_CH', 'viseme_SS',
  'viseme_nn', 'viseme_RR', 'viseme_aa', 'viseme_E',
  'viseme_I', 'viseme_O', 'viseme_U',
] as const;

export type VisemeName = (typeof OCULUS_VISEMES)[number];

const VISEME_INDEX: Record<string, number> = OCULUS_VISEMES.reduce(
  (acc, name, i) => {
    acc[name] = i;
    return acc;
  },
  {} as Record<string, number>
);

export interface LipsyncState {
  /** Current viseme weights (0..1) for each of the 15 Oculus visemes */
  visemes: Float32Array;
  /** Current volume level (0..1) */
  volume: number;
  /** Dominant viseme name */
  dominantViseme: VisemeName;
  /** True when no audio activity detected for >250 ms */
  idle: boolean;
}

interface WawaLipsync {
  features: { volume: number } | null;
  viseme: string;
  connectAudio: (el: HTMLMediaElement) => void;
  processAudio: () => void;
}

export function useLipsync() {
  const stateRef = useRef<LipsyncState>({
    visemes: new Float32Array(15),
    volume: 0,
    dominantViseme: 'viseme_sil',
    idle: true,
  });
  const lipsyncRef = useRef<WawaLipsync | null>(null);
  const lastActiveRef = useRef<number>(0);
  const currentWeightsRef = useRef<Float32Array>(new Float32Array(15));
  const rafRef = useRef<number | null>(null);
  // Timestamp of the most recent `processAudio()` call. Used to throttle
  // analyser work to at most once per ~16 ms even when both the internal
  // RAF and the 3D `<AvatarModel>`'s `useFrame` ask for state in the same
  // browser frame.
  const lastProcessRef = useRef<number>(0);

  // Lazy-init wawa-lipsync on first connectAudio call.
  const ensureLipsync = useCallback(async (): Promise<WawaLipsync | null> => {
    if (lipsyncRef.current) return lipsyncRef.current;
    if (typeof window === 'undefined') return null;
    try {
      const mod = (await import('wawa-lipsync')) as unknown as {
        Lipsync?: new (opts: { fftSize: number; historySize: number }) => unknown;
        default?: { Lipsync?: new (opts: { fftSize: number; historySize: number }) => unknown };
      };
      const Lipsync =
        mod.Lipsync ??
        mod.default?.Lipsync ??
        (mod as unknown as { Lipsync: new (opts: { fftSize: number; historySize: number }) => unknown }).Lipsync;
      if (!Lipsync) return null;
      const instance = new Lipsync({
        fftSize: 2048,
        historySize: 10,
      }) as unknown as WawaLipsync;
      lipsyncRef.current = instance;
      return instance;
    } catch {
      return null;
    }
  }, []);

  // Attempt to wire (or re-wire) the given `<audio>` element into wawa-lipsync's
  // analyser. This is intentionally idempotent: wawa internally dedupes the
  // expensive `createMediaElementSource` call on the same element, AND its
  // `connectAudio` always calls `audioContext.resume()` first — which is the
  // single most reliable way to defeat the browser autoplay-policy "suspended
  // AudioContext" trap.
  //
  // Safe to call multiple times in response to: element mount, `src` changes,
  // and `play` events. Each call is a no-op once the analyser is bound, but
  // still nudges the context awake.
  const connectAudio = useCallback(
    (audioElement: HTMLAudioElement | null) => {
      if (!audioElement) return;
      void (async () => {
        const lipsync = await ensureLipsync();
        if (!lipsync) return;
        // wawa requires a src to be set before it'll bind the analyser.
        if (!audioElement.src) return;
        try {
          lipsync.connectAudio(audioElement);
        } catch {
          // InvalidStateError when re-creating MediaElementSource on the same
          // element is the documented "you already own this" — non-fatal.
        }
      })();
    },
    [ensureLipsync]
  );

  const getState = useCallback((): LipsyncState => {
    const lipsync = lipsyncRef.current;
    const weights = currentWeightsRef.current;

    if (!lipsync) {
      // No lipsync available; ramp everything toward sil.
      for (let i = 0; i < weights.length; i++) {
        weights[i] += ((i === 0 ? 1 : 0) - weights[i]) * 0.1;
      }
      stateRef.current.visemes = weights;
      stateRef.current.volume = 0;
      stateRef.current.dominantViseme = 'viseme_sil';
      stateRef.current.idle = true;
      return stateRef.current;
    }

    // Throttle analyser sampling to once per ~16 ms. Two consumers may call
    // `getState()` in the same frame (our RAF + the 3D `useFrame`) — we don't
    // want to double-sample the analyser or double-fill the rolling history
    // window, which would halve the averaging horizon and make viseme
    // detection jittery.
    const nowMs = performance.now();
    if (nowMs - lastProcessRef.current >= 15) {
      lastProcessRef.current = nowMs;
      try {
        lipsync.processAudio();
      } catch {
        // ignore
      }
    }

    const volume = lipsync.features?.volume ?? 0;
    const dominant = (lipsync.viseme as VisemeName) ?? 'viseme_sil';
    const dominantIdx = VISEME_INDEX[dominant] ?? 0;

    const now = performance.now();
    if (volume > 0.05) lastActiveRef.current = now;
    const idle = now - lastActiveRef.current > 250;

    // Smoothly drive weights toward the dominant viseme (scaled by volume).
    const target = new Float32Array(15);
    if (idle) {
      target[0] = 1; // viseme_sil
    } else {
      target[dominantIdx] = Math.min(1, 0.4 + volume * 1.6);
      target[0] = Math.max(0, 1 - volume * 2); // residual silence weight
    }

    // Critically-damped lerp for stable mouth motion (~30 ms time constant @ 60 fps).
    const SMOOTH = 0.35;
    for (let i = 0; i < 15; i++) {
      weights[i] += (target[i] - weights[i]) * SMOOTH;
    }

    stateRef.current.visemes = weights;
    stateRef.current.volume = volume;
    stateRef.current.dominantViseme = dominant;
    stateRef.current.idle = idle;
    return stateRef.current;
  }, []);

  // Drive `processAudio()` on every animation frame so the analyser keeps
  // emitting fresh volume + viseme data even when the 2D portrait fallback is
  // showing. The 3D `<AvatarModel>` has its own `useFrame` loop, but the
  // portrait only reads `stateRef.current.volume` — without this RAF, volume
  // would stay frozen at 0 and the avatar would never animate while audio
  // played.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const tick = () => {
      // `getState` is safe to call unconditionally — it's a no-op while
      // lipsync is null and a single analyser read + ref update otherwise.
      getState();
      rafRef.current = window.requestAnimationFrame(tick);
    };
    rafRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [getState]);

  useEffect(() => {
    return () => {
      lipsyncRef.current = null;
    };
  }, []);

  return { connectAudio, getState, stateRef };
}
