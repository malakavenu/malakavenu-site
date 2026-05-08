'use client';

import { useEffect, useRef, useState } from 'react';
import { CANVAS_FILTERS, type CanvasFilterPreset } from '@/lib/canvasFilters';
import {
  DEFAULT_EDIT_STATE,
  NEUTRAL_ADJUSTMENTS,
  composeEdit,
  drawEditedToCanvas,
  loadImageElement,
  removeBackground,
  type Adjustments,
  type CropAspect,
  type EditState,
} from '@/lib/imageOps';
import { track } from '@/lib/track';
import { Spinner } from './Spinner';
import { chipStyle, subtleNote } from './playgroundStyles';

const CROP_OPTIONS: Array<{ id: CropAspect; label: string }> = [
  { id: 'free', label: 'Original' },
  { id: '1:1', label: '1:1' },
  { id: '4:3', label: '4:3' },
  { id: '3:4', label: '3:4' },
  { id: '16:9', label: '16:9' },
  { id: '9:16', label: '9:16' },
];

type ToolTab = 'filters' | 'adjust' | 'transform' | 'crop' | 'magic';

const TOOL_TABS: Array<{ id: ToolTab; label: string; icon: string }> = [
  { id: 'filters', label: 'Filters', icon: '🎨' },
  { id: 'adjust', label: 'Adjust', icon: '⚙' },
  { id: 'transform', label: 'Transform', icon: '↻' },
  { id: 'crop', label: 'Crop', icon: '⊟' },
  { id: 'magic', label: 'Magic', icon: '✨' },
];

type Props = {
  /** URL of the user-uploaded image (object URL). */
  originalUrl: string;
  /** Used as a hint for the downloaded filename. */
  baseFilename?: string;
};

export function FilterStudio({ originalUrl, baseFilename = 'malakavenu' }: Props) {
  // `sourceUrl` is what every operation reads from. It starts as the upload
  // and is replaced after destructive ops like background removal so the
  // user can compose multiple effects.
  const [sourceUrl, setSourceUrl] = useState(originalUrl);
  const [bgRemoved, setBgRemoved] = useState(false);
  const [state, setState] = useState<EditState>(DEFAULT_EDIT_STATE);
  const [bgWorking, setBgWorking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageEl, setImageEl] = useState<HTMLImageElement | null>(null);
  const [tab, setTab] = useState<ToolTab>('filters');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const generatedUrlsRef = useRef<string[]>([]);

  // NOTE: parent passes `key={originalUrl}` so this component fully re-mounts
  // whenever the user uploads a different image — no setState-in-effect needed.

  useEffect(() => {
    const tracked = generatedUrlsRef.current;
    return () => {
      for (const url of tracked) URL.revokeObjectURL(url);
    };
  }, []);

  // Load the source image whenever it changes (e.g. after background removal).
  useEffect(() => {
    let cancelled = false;
    loadImageElement(sourceUrl)
      .then((img) => {
        if (!cancelled) setImageEl(img);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load image preview.');
      });
    return () => {
      cancelled = true;
    };
  }, [sourceUrl]);

  // Repaint the preview canvas whenever the image or any edit op changes.
  useEffect(() => {
    if (!imageEl || !canvasRef.current) return;
    try {
      drawEditedToCanvas(canvasRef.current, imageEl, state);
    } catch (err) {
      console.warn('FilterStudio preview render failed:', err);
    }
  }, [imageEl, state]);

  function trackUrl(url: string) {
    generatedUrlsRef.current.push(url);
    return url;
  }

  function setFilter(preset: CanvasFilterPreset | null) {
    setState((s) => ({ ...s, filter: preset }));
    track('playground_filter_select', { filter: preset?.id ?? 'none' });
  }

  function setAdjust<K extends keyof Adjustments>(key: K, value: Adjustments[K]) {
    setState((s) => ({ ...s, adjust: { ...s.adjust, [key]: value } }));
  }

  function rotate(delta: 90 | -90) {
    setState((s) => {
      const next = ((s.rotate + delta + 360) % 360) as EditState['rotate'];
      return { ...s, rotate: next };
    });
  }

  function flip(axis: 'h' | 'v') {
    setState((s) => (axis === 'h' ? { ...s, flipH: !s.flipH } : { ...s, flipV: !s.flipV }));
  }

  function setCrop(aspect: CropAspect) {
    setState((s) => ({ ...s, cropAspect: aspect }));
  }

  function resetAll() {
    setState(DEFAULT_EDIT_STATE);
    if (bgRemoved) {
      setSourceUrl(originalUrl);
      setBgRemoved(false);
    }
    setError(null);
  }

  async function handleRemoveBackground() {
    if (bgWorking) return;
    setBgWorking(true);
    setError(null);
    track('playground_bg_remove_start');
    try {
      const blob = await removeBackground(sourceUrl);
      const url = trackUrl(URL.createObjectURL(blob));
      setSourceUrl(url);
      setBgRemoved(true);
      track('playground_bg_remove_success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Background removal failed.';
      setError(message);
      track('playground_bg_remove_error', { message });
    } finally {
      setBgWorking(false);
    }
  }

  async function handleDownload() {
    if (downloading || !imageEl) return;
    setDownloading(true);
    setError(null);
    try {
      const wantsTransparency = bgRemoved;
      const blob = await composeEdit(imageEl, state, {
        type: wantsTransparency ? 'image/png' : 'image/jpeg',
        quality: 0.92,
      });
      const ext = wantsTransparency ? 'png' : 'jpg';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseFilename}-edit-${Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      track('playground_filter_download', { ext, filter: state.filter?.id ?? 'none' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not export image.';
      setError(message);
    } finally {
      setDownloading(false);
    }
  }

  const dirty =
    state.rotate !== 0 ||
    state.flipH ||
    state.flipV ||
    state.cropAspect !== 'free' ||
    state.filter !== null ||
    state.adjust.brightness !== NEUTRAL_ADJUSTMENTS.brightness ||
    state.adjust.contrast !== NEUTRAL_ADJUSTMENTS.contrast ||
    state.adjust.saturation !== NEUTRAL_ADJUSTMENTS.saturation ||
    state.adjust.hue !== NEUTRAL_ADJUSTMENTS.hue ||
    state.adjust.blur !== NEUTRAL_ADJUSTMENTS.blur ||
    bgRemoved;

  const previewArea = (
    <div className="fs-preview">
      <div className="fs-preview-stage">
        {bgWorking ? (
          <div style={{ display: 'grid', gap: 10, justifyItems: 'center', padding: 24 }}>
            <Spinner label="Removing background…" />
            <p
              style={{
                color: 'var(--text-muted)',
                fontSize: 13,
                textAlign: 'center',
                maxWidth: 320,
              }}
            >
              This may take a few seconds the first time.
            </p>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            aria-label="Live preview"
            className="fs-canvas"
            style={{ display: imageEl ? 'block' : 'none' }}
          />
        )}
        {!imageEl && !bgWorking && <Spinner label="Loading preview…" />}
      </div>

      {error && (
        <div className="fs-error" role="alert">
          {error}
        </div>
      )}

      <div className="fs-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleDownload}
          disabled={downloading || bgWorking || !imageEl}
        >
          {downloading ? 'Exporting…' : 'Download edit'}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={resetAll}
          disabled={!dirty || bgWorking || downloading}
        >
          Reset
        </button>
        <span className="fs-output-label">
          {bgRemoved ? 'PNG · transparent' : 'JPEG · 92%'}
        </span>
      </div>
    </div>
  );

  const controlsArea = (
    <div className="fs-controls">
      <div className="fs-tabs" role="tablist" aria-label="Edit tools">
        {TOOL_TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={`fs-tab ${active ? 'fs-tab--active' : ''}`}
            >
              <span aria-hidden="true" className="fs-tab-icon">
                {t.icon}
              </span>
              <span className="fs-tab-label">{t.label}</span>
            </button>
          );
        })}
      </div>

      <div className="fs-panel">
        {tab === 'filters' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button
              type="button"
              onClick={() => setFilter(null)}
              style={chipFor(state.filter === null)}
            >
              None
            </button>
            {CANVAS_FILTERS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setFilter(preset)}
                style={chipFor(state.filter?.id === preset.id)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        )}

        {tab === 'adjust' && (
          <div className="fs-sliders">
            <Slider
              label="Brightness"
              value={state.adjust.brightness}
              min={50}
              max={150}
              unit="%"
              neutral={100}
              onChange={(v) => setAdjust('brightness', v)}
            />
            <Slider
              label="Contrast"
              value={state.adjust.contrast}
              min={50}
              max={150}
              unit="%"
              neutral={100}
              onChange={(v) => setAdjust('contrast', v)}
            />
            <Slider
              label="Saturation"
              value={state.adjust.saturation}
              min={0}
              max={200}
              unit="%"
              neutral={100}
              onChange={(v) => setAdjust('saturation', v)}
            />
            <Slider
              label="Hue"
              value={state.adjust.hue}
              min={-180}
              max={180}
              unit="°"
              neutral={0}
              onChange={(v) => setAdjust('hue', v)}
            />
            <Slider
              label="Blur"
              value={state.adjust.blur}
              min={0}
              max={6}
              step={0.1}
              unit="px"
              neutral={0}
              onChange={(v) => setAdjust('blur', v)}
            />
          </div>
        )}

        {tab === 'transform' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button
              type="button"
              onClick={() => rotate(-90)}
              style={chipStyle}
              title="Rotate left"
            >
              ↺ 90°
            </button>
            <button
              type="button"
              onClick={() => rotate(90)}
              style={chipStyle}
              title="Rotate right"
            >
              ↻ 90°
            </button>
            <button
              type="button"
              onClick={() => flip('h')}
              style={chipFor(state.flipH)}
              title="Flip horizontal"
            >
              ⇋ Flip H
            </button>
            <button
              type="button"
              onClick={() => flip('v')}
              style={chipFor(state.flipV)}
              title="Flip vertical"
            >
              ⇊ Flip V
            </button>
          </div>
        )}

        {tab === 'crop' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {CROP_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setCrop(opt.id)}
                style={chipFor(state.cropAspect === opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {tab === 'magic' && (
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button
                type="button"
                onClick={handleRemoveBackground}
                disabled={bgWorking}
                style={{
                  ...chipStyle,
                  background: bgRemoved ? 'var(--grad-primary)' : 'transparent',
                  color: bgRemoved ? '#fff' : 'var(--text-soft)',
                  borderColor: bgRemoved ? 'var(--brand-1)' : 'var(--border)',
                  fontWeight: 600,
                }}
              >
                ✨ {bgRemoved ? 'Background removed' : 'Remove background'}
              </button>
              {bgRemoved && (
                <button
                  type="button"
                  onClick={() => {
                    setSourceUrl(originalUrl);
                    setBgRemoved(false);
                  }}
                  style={chipStyle}
                >
                  Restore original
                </button>
              )}
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: 0 }}>
              Cleanly removes the background from people, products, and pets in one click.
            </p>
          </div>
        )}
      </div>

      <p style={{ ...subtleNote, marginTop: 4 }}>
        For a generative restyle that re-imagines your image (Ghibli, anime, cyberpunk…), switch
        to <strong>AI restyle</strong> above.
      </p>
    </div>
  );

  return (
    <>
      <style>{FILTER_STUDIO_CSS}</style>
      <div className="fs-shell">
        {previewArea}
        {controlsArea}
      </div>
    </>
  );
}

const FILTER_STUDIO_CSS = `
.fs-shell {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  align-items: start;
}
.fs-preview {
  display: grid;
  gap: 10px;
  position: sticky;
  top: 8px;
  z-index: 2;
}
.fs-preview-stage {
  display: grid;
  place-items: center;
  border-radius: 12px;
  border: 1px solid var(--border);
  background:
    repeating-conic-gradient(rgba(255,255,255,0.04) 0% 25%, transparent 0% 50%) 50% / 18px 18px,
    var(--bg-card);
  padding: 12px;
  min-height: 220px;
}
.fs-canvas {
  max-width: 100%;
  max-height: 42vh;
  height: auto;
  width: auto;
  object-fit: contain;
  border-radius: 8px;
}
.fs-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 6px 6px 6px 8px;
}
.fs-actions .btn { padding: 8px 14px; font-size: 13px; }
.fs-output-label {
  margin-left: auto;
  color: var(--text-muted);
  font-size: 11.5px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding-right: 10px;
}
.fs-error {
  background: rgba(252, 165, 165, 0.08);
  border: 1px solid rgba(252, 165, 165, 0.4);
  color: #fca5a5;
  font-size: 13px;
  padding: 10px 12px;
  border-radius: 8px;
}
.fs-controls {
  display: grid;
  gap: 12px;
}
.fs-tabs {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 6px;
  scrollbar-width: thin;
}
.fs-tabs::-webkit-scrollbar { height: 4px; }
.fs-tabs::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
.fs-tab {
  scroll-snap-align: start;
  flex: 1 0 auto;
  min-width: 64px;
  display: grid;
  justify-items: center;
  gap: 2px;
  padding: 8px 12px;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: var(--text-soft);
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: background 180ms var(--ease), color 180ms var(--ease);
}
.fs-tab:hover { background: rgba(255, 255, 255, 0.04); }
.fs-tab--active {
  background: var(--grad-primary);
  color: #fff;
  font-weight: 600;
}
.fs-tab-icon { font-size: 16px; line-height: 1; }
.fs-tab-label { font-size: 11.5px; }
.fs-panel {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 14px;
  min-height: 88px;
}
.fs-sliders {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
}

@media (min-width: 720px) {
  .fs-sliders { grid-template-columns: 1fr 1fr; }
}

@media (min-width: 960px) {
  .fs-shell {
    grid-template-columns: minmax(0, 1fr) minmax(320px, 380px);
    gap: 24px;
  }
  .fs-preview {
    top: 16px;
  }
  .fs-canvas {
    max-height: 60vh;
  }
}
`;

function chipFor(active: boolean): React.CSSProperties {
  return {
    ...chipStyle,
    background: active ? 'var(--grad-primary)' : 'transparent',
    color: active ? '#fff' : 'var(--text-soft)',
    borderColor: active ? 'var(--brand-1)' : 'var(--border)',
    fontWeight: active ? 600 : 500,
  };
}

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  neutral,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  neutral: number;
  onChange: (v: number) => void;
}) {
  const isNeutral = Math.abs(value - neutral) < 0.001;
  return (
    <div style={{ display: 'grid', gap: 4 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 12,
          color: 'var(--text-muted)',
        }}
      >
        <span>{label}</span>
        <button
          type="button"
          onClick={() => onChange(neutral)}
          disabled={isNeutral}
          style={{
            background: 'transparent',
            border: 'none',
            color: isNeutral ? 'var(--text-muted)' : 'var(--brand-2)',
            cursor: isNeutral ? 'default' : 'pointer',
            fontSize: 12,
            padding: 0,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {value}
          {unit}
        </button>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--brand-1)' }}
        aria-label={label}
      />
    </div>
  );
}
