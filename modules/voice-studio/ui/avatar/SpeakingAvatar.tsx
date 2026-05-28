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
  mode = 'stage',
  caption,
}: SpeakingAvatarProps) {
  // All avatar view state (preset / 3D toggle / GLB resolution / error tracking)
  // lives in AudioContext so the hero stage and the floating widget render the
  // same avatar with the same settings simultaneously without each owning their
  // own analyser. See AudioContext.tsx for the lifting rationale.
  const {
    avatarPreset: preset,
    setAvatarPreset: setPreset,
    use3D,
    setUse3D,
    glb,
    erroredPresetId,
    setErroredPresetId,
    lipsyncStateRef,
    getLipsyncState,
  } = useAudioContext();

  const [expanded, setExpanded] = useState(false);
  const [minimized, setMinimized] = useState(false);

  const glbError = erroredPresetId === preset.id;
  // Treat the GLB resolution as stale whenever its `presetId` doesn't match
  // the live preset — happens for one render after the user picks a new
  // avatar and before the async resolver in AudioContext posts its result.
  const glbForPreset = glb?.presetId === preset.id ? glb : null;
  const glbUrl = glbForPreset?.url ?? null;
  const glbAvailable = glbForPreset?.available ?? null;

  const volumeReader = useCallback(
    () => lipsyncStateRef.current.volume,
    [lipsyncStateRef]
  );
  const visemeReader = useCallback(
    () => lipsyncStateRef.current.dominantViseme,
    [lipsyncStateRef]
  );

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
    [glbUrl, glbAvailable, setUse3D, setErroredPresetId]
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
            <AvatarCanvas glbUrl={glbUrl} getState={getLipsyncState} mode={renderMode} />
          </Suspense>
        </CanvasErrorBoundary>
      );
    },
    [use3D, glbError, preset, glbUrl, getLipsyncState, volumeReader, visemeReader, setErroredPresetId]
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
