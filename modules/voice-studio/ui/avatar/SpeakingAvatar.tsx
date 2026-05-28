'use client';

/**
 * SpeakingAvatar — high-level avatar widget with three modes:
 *
 *  - `stage`    (default, hero placement)  → large, integrated into the hero
 *  - `widget`   (floating corner)          → small persistent floating widget
 *  - `expanded` (theatrical modal)         → full-screen with sparkles + bigger dpr
 *
 * Defaults to **3D Ready Player Me** with a local-first / remote-fallback URL
 * resolution strategy. If 3D fails for any reason (no WebGL, GLB 404, parsing
 * error), the animated SVG portrait (`AnimatedFace`) is rendered instead —
 * its mouth ellipse opens and reshapes on every frame based on volume +
 * viseme, so users still get real lip-sync without breaking the page.
 */

import {
  useState,
  useCallback,
  useEffect,
  lazy,
  Suspense,
  Component,
  type ReactNode,
} from 'react';
import { useLipsync } from './useLipsync';
import { type AvatarPreset } from './presets';
import { AvatarPortraitFallback } from './AvatarPortraitFallback';
import { SpeakingStage } from './SpeakingStage';
import { useAudioContext } from '../AudioContext';
import styles from '../../styles/avatar.module.css';

// Three.js + R3F is lazy-loaded so SSR + non-3D paths never pay for the bundle.
const AvatarCanvas = lazy(() =>
  import('./AvatarCanvas').then((m) => ({ default: m.AvatarCanvas }))
);

export type AvatarMode = 'stage' | 'widget' | 'expanded';

interface SpeakingAvatarProps {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  mode?: AvatarMode;
  /** Caption rendered with the avatar in `stage` mode */
  caption?: string;
}

// ─── Error boundary for the 3D canvas — drops to portrait on failure ──────
class CanvasErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode; onError?: (e: unknown) => void },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(err: unknown) {
    this.props.onError?.(err);
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

export function SpeakingAvatar({
  audioRef,
  mode = 'stage',
  caption,
}: SpeakingAvatarProps) {
  // Active preset lives in the shared AudioContext so the TTS panels can
  // auto-match the voice to the avatar's gender. `setPreset` is just a
  // pass-through to the context setter so it can keep its existing usage
  // patterns inside this component.
  const { avatarPreset: preset, setAvatarPreset: setPreset } = useAudioContext();
  // 3D toggle starts OFF; it's only flipped to ON (and re-enabled to the
  // user) once we've confirmed a working GLB exists for the active preset.
  const [use3D, setUse3D] = useState(false);
  // GLB resolution state, batched into a single object so we never split
  // updates across renders. `presetId` is the preset that produced the
  // result; if it doesn't match the live preset, the result is stale and
  // we render the 2D fallback while the async resolver catches up.
  const [glb, setGlb] = useState<{
    presetId: string;
    url: string | null;
    available: boolean;
  } | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [minimized, setMinimized] = useState(false);
  // Track WHICH preset most recently failed its 3D load. Storing the id (not
  // a bare boolean) means switching avatars automatically clears the error
  // for the new preset without needing a setState-in-effect reset hack.
  const [erroredPresetId, setErroredPresetId] = useState<string | null>(null);
  const glbError = erroredPresetId === preset.id;

  // Treat the current GLB resolution as stale (== still probing) whenever
  // its `presetId` doesn't match the live preset.id — this happens for one
  // render after the user picks a new avatar and before the async resolver
  // posts its result.
  const glbForPreset = glb?.presetId === preset.id ? glb : null;
  const glbUrl = glbForPreset?.url ?? null;
  const glbAvailable = glbForPreset?.available ?? null;

  const { connectAudio, getState, stateRef } = useLipsync();
  const volumeReader = useCallback(() => stateRef.current.volume, [stateRef]);
  const visemeReader = useCallback(
    () => stateRef.current.dominantViseme,
    [stateRef]
  );
  const { audioMountTick, activeTrack } = useAudioContext();

  // Resolve which GLB to load for the active preset. Priority:
  //   1. Local file under /public/voice-studio/avatars/, if listed in the
  //      checked-in manifest (`npm run voice-studio:avatars` updates it).
  //   2. The preset's remoteUrl, if set (currently a CC-licensed avatar on
  //      jsDelivr — RPM's CDN was shut down in Jan 2026).
  //   3. Otherwise no GLB: stay in 2D portrait mode and disable the toggle.
  //
  // The manifest is fetched (not the GLB itself) to avoid HEAD-probing GLB
  // URLs that may 404 — browsers log those failures before our try/catch can
  // see them, polluting DevTools.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Step 1 — check the local manifest.
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

      if (localIds.includes(preset.id)) {
        setGlb({ presetId: preset.id, url: preset.localUrl, available: true });
        return;
      }

      // Step 2 — fall back to the remote CDN URL if the preset has one.
      if (preset.remoteUrl) {
        setGlb({ presetId: preset.id, url: preset.remoteUrl, available: true });
        return;
      }

      // Step 3 — no usable GLB; keep 3D toggle disabled.
      setGlb({ presetId: preset.id, url: null, available: false });
      setUse3D(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [preset]);


  // Drive the lipsync connection on every event that could meaningfully
  // change the audio pipeline:
  //   - the underlying <audio> element mounts (audioMountTick),
  //   - a new track is published (activeTrack.url),
  //   - the user presses play (which is the user gesture that's allowed to
  //     resume a suspended AudioContext — without this, wawa-lipsync's
  //     analyser sees 0 volume even though audio is audible).
  // The hook's `connectAudio` is idempotent + always calls `audioContext.resume()`
  // through wawa, so repeated calls are safe and double as the unlock signal.
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
  }, [audioRef, connectAudio, audioMountTick, activeTrack?.url]);

  const handlePreset = useCallback(
    (p: AvatarPreset) => {
      // Switching preset auto-clears prior errors because `glbError` is
      // derived from `erroredPresetId === preset.id`.
      setPreset(p);
    },
    [setPreset]
  );

  const handleToggle3D = useCallback(
    (next: boolean) => {
      // Block opt-in to 3D until we've confirmed a usable GLB. The toggle is
      // rendered disabled in this state, but guard here too for safety.
      if (next && (!glbUrl || glbAvailable !== true)) return;
      setUse3D(next);
      // Re-enabling 3D should give a previously-errored GLB another chance.
      setErroredPresetId(null);
    },
    [glbUrl, glbAvailable]
  );
  const handleExpand = useCallback(() => setExpanded(true), []);
  const handleClose = useCallback(() => setExpanded(false), []);

  // Render the inside (canvas or portrait), shared across modes.
  const renderAvatar = useCallback(
    (renderMode: 'stage' | 'widget' | 'expanded') => {
      // Portrait path: 3D off, or no usable GLB, or 3D crashed earlier.
      if (!use3D || !glbUrl || glbError) {
        return (
          <AvatarPortraitFallback
            seed={preset.portraitSeed}
            getVolume={volumeReader}
            getViseme={visemeReader}
            size={renderMode}
            caption={renderMode === 'widget' ? undefined : preset.name}
            gender={preset.gender}
          />
        );
      }
      return (
        <CanvasErrorBoundary
          fallback={
            <AvatarPortraitFallback
              seed={preset.portraitSeed}
              getVolume={volumeReader}
              getViseme={visemeReader}
              size={renderMode}
              caption={preset.name}
              gender={preset.gender}
            />
          }
          onError={() => setErroredPresetId(preset.id)}
        >
          <Suspense
            fallback={
              <AvatarPortraitFallback
                seed={preset.portraitSeed}
                getVolume={volumeReader}
                getViseme={visemeReader}
                size={renderMode}
                gender={preset.gender}
              />
            }
          >
            <AvatarCanvas glbUrl={glbUrl} getState={getState} mode={renderMode} />
          </Suspense>
        </CanvasErrorBoundary>
      );
    },
    [use3D, glbError, preset, glbUrl, getState, volumeReader, visemeReader]
  );

  // ─── Widget mode (floating corner) ──────────────────────────────────────
  if (mode === 'widget') {
    if (minimized) {
      return (
        <button
          type="button"
          className={styles.minimizedBtn}
          onClick={() => setMinimized(false)}
          aria-label="Show avatar"
          title="Show avatar"
        >
          <MicIcon />
        </button>
      );
    }
    return (
      <>
        <div className={styles.widget}>
          <div className={styles.widgetHeader}>
            <span className={styles.widgetTitle}>{preset.name}</span>
            <button
              type="button"
              className={styles.widgetBtn}
              onClick={() => setExpanded(true)}
              title="Expand"
              aria-label="Expand avatar"
            >
              <ExpandIcon />
            </button>
            <button
              type="button"
              className={styles.widgetBtn}
              onClick={() => setMinimized(true)}
              title="Minimize"
              aria-label="Minimize avatar"
            >
              <MinusIcon />
            </button>
          </div>
          <div className={styles.widgetCanvas}>{renderAvatar('widget')}</div>
        </div>
        {expanded && (
          <ExpandedModal
            preset={preset}
            onSelectPreset={handlePreset}
            use3D={use3D}
            onToggle3D={handleToggle3D}
            canUse3D={glbAvailable === true}
            onClose={handleClose}
            volumeReader={volumeReader}
          >
            {renderAvatar('expanded')}
          </ExpandedModal>
        )}
      </>
    );
  }

  // ─── Stage mode (hero placement) ────────────────────────────────────────
  return (
    <>
      <SpeakingStage
        getVolume={volumeReader}
        preset={preset}
        onSelectPreset={handlePreset}
        use3D={use3D && !glbError}
        onToggle3D={handleToggle3D}
        canUse3D={glbAvailable === true}
        onExpand={handleExpand}
        caption={caption}
        size="stage"
      >
        {renderAvatar('stage')}
      </SpeakingStage>

      {expanded && (
        <ExpandedModal
          preset={preset}
          onSelectPreset={handlePreset}
          use3D={use3D && !glbError}
          onToggle3D={handleToggle3D}
          canUse3D={glbAvailable === true}
          onClose={handleClose}
          volumeReader={volumeReader}
        >
          {renderAvatar('expanded')}
        </ExpandedModal>
      )}
    </>
  );
}

// ─── Theatrical expanded modal ───────────────────────────────────────────

interface ExpandedModalProps {
  children: ReactNode;
  preset: AvatarPreset;
  onSelectPreset: (p: AvatarPreset) => void;
  use3D: boolean;
  onToggle3D: (next: boolean) => void;
  canUse3D: boolean;
  onClose: () => void;
  volumeReader: () => number;
}

function ExpandedModal({
  children,
  preset,
  onSelectPreset,
  use3D,
  onToggle3D,
  canUse3D,
  onClose,
  volumeReader,
}: ExpandedModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className={styles.modal} role="dialog" aria-modal="true">
      <div className={styles.modalBackdrop} onClick={onClose} aria-hidden="true" />
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{preset.name}</h3>
          <button
            type="button"
            onClick={onClose}
            className={styles.modalClose}
            aria-label="Close avatar"
          >
            <CloseIcon />
          </button>
        </div>
        <div className={styles.modalCanvas}>
          <SpeakingStage
            getVolume={volumeReader}
            preset={preset}
            onSelectPreset={onSelectPreset}
            use3D={use3D}
            onToggle3D={onToggle3D}
            canUse3D={canUse3D}
            onExpand={onClose}
            size="expanded"
          >
            {children}
          </SpeakingStage>
        </div>
      </div>
    </div>
  );
}

// ─── Icons ───────────────────────────────────────────────────────────────

function MicIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 3h6v6" />
      <path d="M9 21H3v-6" />
      <path d="M21 3l-7 7" />
      <path d="M3 21l7-7" />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}
