'use client';

/**
 * Shared audio context.
 *
 * Three responsibilities:
 *   1. Hold a single `<audio>` element ref that the lipsync analyser connects to.
 *   2. Track the "active track" (URL + metadata) so the persistent `FloatingPlayer`
 *      can render controls without each panel rendering its own inline player.
 *   3. Own the SINGLE `useLipsync()` analyser + the SINGLE `SpeakingAvatar`
 *      view-state (preset, 3D toggle, GLB resolution). Lifting these here lets
 *      consumers read lipsync state from anywhere without each instance trying
 *      to call `AudioContext.createMediaElementSource` on the same element —
 *      which Web Audio only allows once per element.
 *
 * Panels:
 *   - Call `publishTrack({ url, title, provider, panel })` whenever they produce
 *     a new audio blob.
 *   - The `FloatingPlayer` renders the audio element and the controls.
 *   - Avatars (`<SpeakingAvatar>`) read `lipsyncStateRef.current` to drive faces.
 *
 * When a new track is published the hero stage is auto-scrolled into view so
 * the avatar is visible while the audio plays — preferred over a floating
 * mini-widget because it keeps the user inside the studio's main canvas.
 */

import {
  createContext,
  useContext,
  useRef,
  useCallback,
  useEffect,
  useState,
  type MutableRefObject,
  type ReactNode,
} from 'react';
import type { PanelId } from '../types';
import {
  AVATAR_PRESETS,
  DEFAULT_AVATAR_ID,
  getPreset,
  type AvatarPreset,
} from './avatar/presets';
import { useLipsync, type LipsyncState } from './avatar/useLipsync';

export interface ActiveTrack {
  url: string;
  title: string;
  provider?: string;
  panel: PanelId;
  /** Optional caption rendered on the avatar stage */
  caption?: string;
  /** Created timestamp (epoch ms) */
  ts: number;
}

/**
 * Resolved GLB for the active preset. `presetId` records WHICH preset produced
 * the result so we can tell stale results apart from current ones (one render
 * after a switch, before the async resolver posts).
 */
interface GlbResolution {
  presetId: string;
  url: string | null;
  available: boolean;
}

interface AudioContextValue {
  // ─── Audio plumbing ─────────────────────────────────────────────────────
  /** Imperatively set the active <audio> element ref (used by FloatingPlayer) */
  setActiveAudio: (el: HTMLAudioElement | null) => void;
  /** Ref always pointing at the currently mounted <audio> element */
  audioRef: React.RefObject<HTMLAudioElement | null>;
  /**
   * Bumps each time a new audio element is registered. Consumers that wire to
   * the element (lipsync, visualisers) include this in their effect deps so
   * they re-run after `<audio>` mounts, regardless of mount-ordering.
   */
  audioMountTick: number;
  /** Currently playing track metadata, null when nothing is queued */
  activeTrack: ActiveTrack | null;
  /** Publish a new track to the floating player */
  publishTrack: (track: Omit<ActiveTrack, 'ts'>) => void;
  /** Clear the active track */
  clearTrack: () => void;

  // ─── Avatar view state (shared so hero + floating widget stay in sync) ───
  avatarPreset: AvatarPreset;
  setAvatarPreset: (preset: AvatarPreset) => void;
  /** Whether the user has opted-in to 3D rendering for the active preset. */
  use3D: boolean;
  setUse3D: (next: boolean) => void;
  /** GLB resolution for the live preset (null while still probing). */
  glb: GlbResolution | null;
  /** Which preset most recently crashed during 3D load. */
  erroredPresetId: string | null;
  setErroredPresetId: (id: string | null) => void;

  // ─── Lipsync analyser (single instance shared by all SpeakingAvatars) ────
  lipsyncStateRef: MutableRefObject<LipsyncState>;
  getLipsyncState: () => LipsyncState;

  /**
   * `<HeroStage>` registers its element here so `publishTrack` can scroll
   * it back into view when a new audio clip starts playing.
   */
  setHeroElement: (el: HTMLElement | null) => void;
}

const Ctx = createContext<AudioContextValue | null>(null);

interface AudioContextProviderProps {
  children: ReactNode;
  /** Initial avatar preset id — usually from VoiceStudioConfig.defaultAvatarId */
  defaultAvatarId?: string;
}

export function AudioContextProvider({
  children,
  defaultAvatarId,
}: AudioContextProviderProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [activeTrack, setActiveTrack] = useState<ActiveTrack | null>(null);
  const [audioMountTick, setAudioMountTick] = useState(0);
  const [avatarPreset, setAvatarPreset] = useState<AvatarPreset>(
    () => getPreset(defaultAvatarId ?? DEFAULT_AVATAR_ID) ?? AVATAR_PRESETS[0]
  );
  const [use3D, setUse3D] = useState(false);
  const [glb, setGlb] = useState<GlbResolution | null>(null);
  const [erroredPresetId, setErroredPresetId] = useState<string | null>(null);
  // Hero element is held in a ref (not state) because only `publishTrack`
  // reads it; nothing needs to re-render when the registration flips.
  const heroElementRef = useRef<HTMLElement | null>(null);
  const setHeroElement = useCallback((el: HTMLElement | null) => {
    heroElementRef.current = el;
  }, []);

  // ─── Lipsync analyser — single shared instance ──────────────────────────
  const { connectAudio, getState: getLipsyncState, stateRef: lipsyncStateRef } =
    useLipsync();

  const setActiveAudio = useCallback((el: HTMLAudioElement | null) => {
    audioRef.current = el;
    // Only bump when a real element is registered — null teardowns shouldn't
    // wake consumers and trigger a useless reconnect attempt.
    if (el) setAudioMountTick((t) => t + 1);
  }, []);

  const publishTrack = useCallback((track: Omit<ActiveTrack, 'ts'>) => {
    setActiveTrack({ ...track, ts: Date.now() });
    // Scroll the avatar stage back into view when a new clip starts. Without
    // this, users who scroll down to interact with a panel never get to see
    // the talking head while their audio plays.
    //
    // Only scroll when the hero is meaningfully off-screen (its top is above
    // a small threshold) so that already-visible hero pages don't shift.
    // Respect prefers-reduced-motion.
    if (typeof window === 'undefined') return;
    const el = heroElementRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const offscreen = rect.bottom < 120 || rect.top > 80;
    if (!offscreen) return;
    const reduceMotion = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    el.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  }, []);

  const clearTrack = useCallback(() => setActiveTrack(null), []);

  // ─── Wire the lipsync analyser to the live <audio> element ───────────────
  //
  // Re-runs on every event that can meaningfully change the pipeline:
  //   - audio element mounts/remounts (audioMountTick)
  //   - a new track is published (activeTrack?.url)
  //   - the user presses play (allowed gesture to resume a suspended
  //     AudioContext — without it, wawa's analyser sees 0 volume even though
  //     audio is audible).
  // `connectAudio` is idempotent + always calls `audioContext.resume()` via
  // wawa, so repeated calls are safe and double as the unlock signal.
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    connectAudio(el);
    const onPlay = () => connectAudio(el);
    const onLoadedMeta = () => connectAudio(el);
    el.addEventListener('play', onPlay);
    el.addEventListener('loadedmetadata', onLoadedMeta);
    return () => {
      el.removeEventListener('play', onPlay);
      el.removeEventListener('loadedmetadata', onLoadedMeta);
    };
  }, [connectAudio, audioMountTick, activeTrack?.url]);

  // ─── Resolve GLB for the active preset ──────────────────────────────────
  //
  // Priority:
  //   1. Local file under /public/voice-studio/avatars/, if listed in the
  //      checked-in manifest (`npm run voice-studio:avatars` updates it).
  //   2. The preset's remoteUrl (currently a CC-licensed avatar on jsDelivr).
  //   3. Otherwise no GLB: stay in 2D portrait mode and disable 3D.
  //
  // We fetch the manifest, not the GLB itself, to avoid HEAD-probing URLs
  // that may 404 — browsers log those failures before our try/catch can see
  // them, polluting DevTools.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let localIds: string[] = [];
      try {
        const res = await fetch('/voice-studio/avatars/manifest.json', {
          cache: 'force-cache',
        });
        if (res.ok) {
          const data = (await res.json()) as { available?: string[] };
          if (Array.isArray(data.available)) localIds = data.available;
        }
      } catch {
        // Manifest read failed — proceed as if empty.
      }
      if (cancelled) return;

      if (localIds.includes(avatarPreset.id)) {
        setGlb({
          presetId: avatarPreset.id,
          url: avatarPreset.localUrl,
          available: true,
        });
        return;
      }
      if (avatarPreset.remoteUrl) {
        setGlb({
          presetId: avatarPreset.id,
          url: avatarPreset.remoteUrl,
          available: true,
        });
        return;
      }
      setGlb({ presetId: avatarPreset.id, url: null, available: false });
      setUse3D(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [avatarPreset]);

  return (
    <Ctx.Provider
      value={{
        setActiveAudio,
        audioRef,
        audioMountTick,
        activeTrack,
        publishTrack,
        clearTrack,
        avatarPreset,
        setAvatarPreset,
        use3D,
        setUse3D,
        glb,
        erroredPresetId,
        setErroredPresetId,
        lipsyncStateRef,
        getLipsyncState,
        setHeroElement,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAudioContext(): AudioContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Fallback only used in tests / preview rendering outside the provider.
    // Keeps the API contract intact so consumers never need null-checks.
    const noopRef = { current: null } as MutableRefObject<HTMLAudioElement | null>;
    const noopState: LipsyncState = {
      visemes: new Float32Array(15),
      volume: 0,
      dominantViseme: 'viseme_sil',
      idle: true,
    };
    const stateRef = { current: noopState } as MutableRefObject<LipsyncState>;
    return {
      setActiveAudio: () => {},
      audioRef: noopRef,
      audioMountTick: 0,
      activeTrack: null,
      publishTrack: () => {},
      clearTrack: () => {},
      avatarPreset: getPreset(DEFAULT_AVATAR_ID) ?? AVATAR_PRESETS[0],
      setAvatarPreset: () => {},
      use3D: false,
      setUse3D: () => {},
      glb: null,
      erroredPresetId: null,
      setErroredPresetId: () => {},
      lipsyncStateRef: stateRef,
      getLipsyncState: () => noopState,
      setHeroElement: () => {},
    };
  }
  return ctx;
}
