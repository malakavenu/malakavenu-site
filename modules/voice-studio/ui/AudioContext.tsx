'use client';

/**
 * Shared audio context.
 *
 * Two responsibilities:
 *   1. Hold a single `<audio>` element ref that the lipsync avatar can connect to.
 *   2. Track the "active track" (URL + metadata) so the persistent `FloatingPlayer`
 *      can render controls without each panel rendering its own inline player.
 *
 * Panels:
 *   - Call `publishTrack({ url, title, provider, panel })` whenever they produce
 *     a new audio blob.
 *   - The `FloatingPlayer` renders the audio element and the controls.
 *   - The avatar reads `audioRef.current` to drive lipsync.
 */

import {
  createContext,
  useContext,
  useRef,
  useCallback,
  useState,
  type ReactNode,
} from 'react';
import type { PanelId } from '../types';
import { AVATAR_PRESETS, DEFAULT_AVATAR_ID, getPreset, type AvatarPreset } from './avatar/presets';

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

interface AudioContextValue {
  /** Imperatively set the active <audio> element ref (used by FloatingPlayer) */
  setActiveAudio: (el: HTMLAudioElement | null) => void;
  /** Ref always pointing at the currently mounted <audio> element */
  audioRef: React.RefObject<HTMLAudioElement | null>;
  /**
   * Bumps each time a new audio element is registered. Consumers (e.g. the
   * lipsync avatar) include this in their effect deps so they re-run after
   * `<audio>` mounts, regardless of mount-ordering between siblings.
   */
  audioMountTick: number;
  /** Currently playing track metadata, null when nothing is queued */
  activeTrack: ActiveTrack | null;
  /** Publish a new track to the floating player */
  publishTrack: (track: Omit<ActiveTrack, 'ts'>) => void;
  /** Clear the active track */
  clearTrack: () => void;
  /**
   * Currently active avatar preset — shared so panels can react to avatar
   * changes (e.g. auto-pick a gender-matching voice) without prop-drilling.
   * Lives here (not its own context) because the avatar IS part of the
   * playback experience the panels already plug into.
   */
  avatarPreset: AvatarPreset;
  /** Imperatively switch the active avatar preset */
  setAvatarPreset: (preset: AvatarPreset) => void;
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

  const setActiveAudio = useCallback((el: HTMLAudioElement | null) => {
    audioRef.current = el;
    // Only bump when a real element is registered — null teardowns shouldn't
    // wake consumers and trigger a useless reconnect attempt.
    if (el) setAudioMountTick((t) => t + 1);
  }, []);

  const publishTrack = useCallback((track: Omit<ActiveTrack, 'ts'>) => {
    setActiveTrack({ ...track, ts: Date.now() });
  }, []);

  const clearTrack = useCallback(() => setActiveTrack(null), []);

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
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAudioContext(): AudioContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) {
    return {
      setActiveAudio: () => {},
      audioRef: { current: null },
      audioMountTick: 0,
      activeTrack: null,
      publishTrack: () => {},
      clearTrack: () => {},
      avatarPreset: getPreset(DEFAULT_AVATAR_ID) ?? AVATAR_PRESETS[0],
      setAvatarPreset: () => {},
    };
  }
  return ctx;
}
