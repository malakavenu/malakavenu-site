'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { track } from '@/lib/track';
import { FilterStudio } from './FilterStudio';
import { Spinner } from './Spinner';
import { subtleNote, surfaceStyle, textareaStyle } from './playgroundStyles';

/**
 * EditTab — image-to-image (Kontext) editing.
 *
 * Pipeline:
 *  1. User selects/drops a source image.
 *  2. compressInBrowser() resizes + recompresses to keep upload under ~1 MB.
 *  3. POST /api/upload-temp-image → returns a temporary public URL (10-min TTL via Upstash).
 *  4. POST /api/edit-image with { imageUrl, prompt } → bytes of the edited image.
 *  5. Render the original + edited side by side.
 */

const STYLES = [
  { emoji: '🌿', label: 'Studio Ghibli', prompt: 'Restyle as a Studio Ghibli illustration with soft watercolor textures and warm light' },
  { emoji: '🎌', label: 'Anime', prompt: 'Restyle as a high-quality modern anime illustration, clean line art, vivid colors' },
  { emoji: '🌃', label: 'Cyberpunk neon', prompt: 'Add cinematic cyberpunk neon lighting, magenta and cyan accents, light rain reflections' },
  { emoji: '🎨', label: 'Watercolor', prompt: 'Restyle as a delicate hand-painted watercolor with visible paper texture and soft edges' },
  { emoji: '👾', label: 'Pixel art', prompt: 'Restyle as detailed 32-bit pixel art with limited palette and sharp pixel edges' },
  { emoji: '💥', label: 'Comic book', prompt: 'Restyle as a Western comic book panel with bold ink outlines and halftone shading' },
  { emoji: '✏️', label: 'Pencil sketch', prompt: 'Convert to a detailed graphite pencil sketch on textured paper' },
  { emoji: '📸', label: 'Polaroid', prompt: 'Make this look like a slightly faded 1970s Polaroid photograph with warm tones' },
];

const MAX_PROMPT = 500;
const MAX_DIM = 1280;
const TARGET_QUALITY = 0.85;

type EditStatus = 'idle' | 'compressing' | 'uploading' | 'editing' | 'done' | 'error';

type EditMode = 'ai' | 'filter';

type Result = {
  originalUrl: string;
  editedUrl: string;
  prompt: string;
  ms: number;
  filename: string;
};

type EditTabProps = {
  /**
   * Optional file to load on mount (used by the Generate → Edit pipe).
   * Once consumed, EditTab calls onInitialConsumed() so the parent can
   * clear it and avoid re-loading on subsequent mounts.
   */
  initialFile?: File | null;
  onInitialConsumed?: () => void;
};

export function EditTab({ initialFile, onInitialConsumed }: EditTabProps = {}) {
  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [editMode, setEditMode] = useState<EditMode>('filter');
  const [status, setStatus] = useState<EditStatus>('idle');
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlsRef = useRef<string[]>([]);
  const initialConsumedRef = useRef(false);

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      objectUrlsRef.current = [];
    };
  }, []);

  function pushObjectUrl(url: string): string {
    objectUrlsRef.current.push(url);
    return url;
  }

  function revokeAllObjectUrls() {
    objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    objectUrlsRef.current = [];
  }

  const pickFile = useCallback(
    (input: File | null | undefined, source: 'upload' | 'pipe' = 'upload') => {
      if (!input) return;
      if (input.size > 15 * 1024 * 1024) {
        setError('Source image is over 15 MB. Try a smaller one.');
        return;
      }
      revokeAllObjectUrls();
      setError(null);
      setResult(null);
      setFile(input);
      setOriginalUrl(pushObjectUrl(URL.createObjectURL(input)));
      track('playground_edit_upload', {
        bytes: input.size,
        type: input.type || 'unknown',
        source,
      });
    },
    [],
  );

  // Cross-tab pipe: when an initialFile prop arrives (because the user
  // clicked "Edit this" in the Generate tab), load it once and tell the
  // parent we consumed it so it can clear its state.
  useEffect(() => {
    if (!initialFile || initialConsumedRef.current) return;
    initialConsumedRef.current = true;
    pickFile(initialFile, 'pipe');
    onInitialConsumed?.();
  }, [initialFile, pickFile, onInitialConsumed]);

  async function compressInBrowser(input: File): Promise<Blob> {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Could not read file.'));
      reader.readAsDataURL(input);
    });

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('Could not decode image.'));
      i.src = dataUrl;
    });

    const ratio = Math.min(MAX_DIM / img.width, MAX_DIM / img.height, 1);
    const w = Math.round(img.width * ratio);
    const h = Math.round(img.height * ratio);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable.');
    ctx.drawImage(img, 0, 0, w, h);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', TARGET_QUALITY),
    );
    if (!blob) throw new Error('Could not compress image.');
    return blob;
  }

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!file || !prompt.trim() || status !== 'idle') return;

    const trimmed = prompt.trim();
    setError(null);
    setResult(null);

    const startedAt = performance.now();
    track('playground_edit_start', { prompt_len: trimmed.length });

    try {
      setStatus('compressing');
      const compressed = await compressInBrowser(file);

      setStatus('uploading');
      const fd = new FormData();
      fd.append('image', compressed, 'input.jpg');
      const upRes = await fetch('/api/upload-temp-image', { method: 'POST', body: fd });
      if (!upRes.ok) {
        const data = await upRes.json().catch(() => ({}) as { error?: string });
        throw new Error(data?.error || `Upload failed (${upRes.status}).`);
      }
      const upJson = (await upRes.json()) as { url: string };

      setStatus('editing');
      const editRes = await fetch('/api/edit-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: upJson.url, prompt: trimmed }),
      });
      if (!editRes.ok) {
        const data = await editRes.json().catch(() => ({}) as { error?: string });
        throw new Error(data?.error || `Edit failed (${editRes.status}).`);
      }

      const blob = await editRes.blob();
      const editedUrl = pushObjectUrl(URL.createObjectURL(blob));
      const ms = Math.round(performance.now() - startedAt);
      const provider = editRes.headers.get('X-Image-Provider') || 'unknown';
      setResult({
        originalUrl: originalUrl!,
        editedUrl,
        prompt: trimmed,
        ms,
        filename: `malakavenu-edit-${Date.now()}.png`,
      });
      setStatus('done');
      track('playground_edit_success', { provider, ms });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      setError(message);
      setStatus('error');
      track('playground_edit_error', { message });
    }
  }

  function reset() {
    if (status === 'compressing' || status === 'uploading' || status === 'editing') {
      return;
    }
    revokeAllObjectUrls();
    setFile(null);
    setOriginalUrl(null);
    setPrompt('');
    setStatus('idle');
    setResult(null);
    setError(null);
  }

  const busy = status === 'compressing' || status === 'uploading' || status === 'editing';

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <Dropzone
        file={file}
        originalUrl={originalUrl}
        onPick={pickFile}
        onClear={reset}
        inputRef={fileInputRef}
        disabled={busy}
      />

      <SubModeToggle
        mode={editMode}
        onChange={(m) => {
          if (m !== editMode) {
            track('playground_edit_mode_switch', { from: editMode, to: m });
          }
          setEditMode(m);
        }}
        disabled={busy}
      />

      {editMode === 'filter' &&
        (originalUrl ? (
          <FilterStudio key={originalUrl} originalUrl={originalUrl} />
        ) : (
          <div
            style={{
              ...surfaceStyle,
              display: 'grid',
              placeItems: 'center',
              minHeight: 200,
              padding: 24,
            }}
          >
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', maxWidth: 380 }}>
              Upload an image above to unlock filters, adjustments, transforms, and one-click
              background removal. Everything runs locally in your browser.
            </p>
          </div>
        ))}

      {editMode === 'ai' && (
      <form onSubmit={submit} style={{ display: 'grid', gap: 16 }}>
        <div style={{ display: 'grid', gap: 8 }}>
          <label htmlFor="edit-prompt" style={{ fontWeight: 600, color: 'var(--text)' }}>
            What would you like to change?
          </label>
          <textarea
            id="edit-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value.slice(0, MAX_PROMPT))}
            placeholder="e.g. Make the lighting golden hour, replace the background with a forest…"
            rows={3}
            maxLength={MAX_PROMPT}
            disabled={busy}
            style={textareaStyle}
          />
        </div>

        <div className="pg-styles">
          {STYLES.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => setPrompt(s.prompt.slice(0, MAX_PROMPT))}
              disabled={busy}
              className="pg-style"
            >
              <span className="pg-style-emoji" aria-hidden="true">
                {s.emoji}
              </span>
              {s.label}
            </button>
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            {prompt.length}/{MAX_PROMPT} · usually 15–40s
          </span>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!file || !prompt.trim() || busy}
            style={{ minWidth: 160 }}
          >
            {status === 'compressing'
              ? 'Compressing…'
              : status === 'uploading'
                ? 'Uploading…'
                : status === 'editing'
                  ? 'Editing…'
                  : 'Edit image'}
          </button>
        </div>
      </form>
      )}

      {editMode === 'ai' && (
        <>
          <ResultPanel
            status={status}
            error={error}
            result={result}
            originalUrl={originalUrl}
            onRetry={() => submit()}
          />

          <p style={subtleNote}>
            Uploads are kept in temporary cache for a few minutes and then auto-deleted — we never
            store your images. If AI restyle is unavailable, switch to{' '}
            <strong>Free filters</strong> above for an instant restyle.
          </p>
        </>
      )}
    </div>
  );
}

function SubModeToggle({
  mode,
  onChange,
  disabled,
}: {
  mode: EditMode;
  onChange: (m: EditMode) => void;
  disabled: boolean;
}) {
  const options: Array<{ id: EditMode; label: string; hint: string }> = [
    { id: 'filter', label: 'Free filters', hint: 'Instant · in your browser' },
    { id: 'ai', label: 'AI restyle', hint: 'Generative AI · slower' },
  ];
  return (
    <div className="pg-submode" role="group" aria-label="Edit mode">
      {options.map((opt) => {
        const active = mode === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.id)}
            disabled={disabled}
            title={opt.hint}
            className="pg-submode-opt"
          >
            {opt.label}
            <small> · {opt.hint.split(' · ')[0]}</small>
          </button>
        );
      })}
    </div>
  );
}

function Dropzone({
  file,
  originalUrl,
  onPick,
  onClear,
  inputRef,
  disabled,
}: {
  file: File | null;
  originalUrl: string | null;
  onPick: (file: File | null | undefined) => void;
  onClear: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  disabled: boolean;
}) {
  const [hover, setHover] = useState(false);

  if (originalUrl && file) {
    return (
      <div
        style={{
          position: 'relative',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          border: '1px solid var(--border)',
          background: 'var(--bg-card)',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={originalUrl}
          alt={file.name}
          style={{
            width: '100%',
            maxHeight: 320,
            objectFit: 'contain',
            display: 'block',
          }}
        />
        <div style={{ position: 'absolute', bottom: 12, right: 12, display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
            className="btn btn-ghost"
            style={{ padding: '6px 12px', fontSize: 12 }}
          >
            Replace
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={disabled}
            className="btn btn-ghost"
            style={{ padding: '6px 12px', fontSize: 12 }}
          >
            Remove
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => onPick(e.target.files?.[0])}
          style={{ display: 'none' }}
          disabled={disabled}
        />
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setHover(true);
        }}
        onDragLeave={() => setHover(false)}
        onDrop={(e) => {
          e.preventDefault();
          setHover(false);
          const f = e.dataTransfer.files?.[0];
          if (f) onPick(f);
        }}
        disabled={disabled}
        className="pg-dropzone"
        data-hover={hover || undefined}
      >
        <span className="pg-dropzone-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" focusable="false">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </span>
        <div>
          <p className="pg-dropzone-title">Tap to upload or drag a photo here</p>
          <p className="pg-dropzone-hint">
            We compress it to 1280 px in your browser before uploading. Files auto-delete after a
            few minutes — nothing is kept.
          </p>
        </div>
        <div className="pg-dropzone-formats" aria-hidden="true">
          <span>JPG</span>
          <span>PNG</span>
          <span>WEBP</span>
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => onPick(e.target.files?.[0])}
        style={{ display: 'none' }}
        disabled={disabled}
      />
    </>
  );
}

function ResultPanel({
  status,
  error,
  result,
  originalUrl,
  onRetry,
}: {
  status: EditStatus;
  error: string | null;
  result: Result | null;
  originalUrl: string | null;
  onRetry: () => void;
}) {
  if (status === 'idle' && !result) {
    return (
      <div style={{ ...surfaceStyle, display: 'grid', placeItems: 'center', minHeight: 240 }}>
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', maxWidth: 420 }}>
          Upload an image, choose a style chip or write a custom instruction, then hit{' '}
          <strong>Edit image</strong>. The result appears side-by-side here.
        </p>
      </div>
    );
  }

  if (status === 'compressing' || status === 'uploading' || status === 'editing') {
    const message =
      status === 'compressing'
        ? 'Preparing your image…'
        : status === 'uploading'
          ? 'Uploading…'
          : 'Restyling — usually 15 to 40 seconds.';
    return (
      <div style={{ ...surfaceStyle, display: 'grid', placeItems: 'center', minHeight: 240 }}>
        <div style={{ textAlign: 'center', display: 'grid', gap: 12 }}>
          <Spinner label={message} />
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{message}</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div style={{ ...surfaceStyle, display: 'grid', placeItems: 'center', minHeight: 240 }}>
        <div style={{ textAlign: 'center', maxWidth: 480 }}>
          <p style={{ color: '#fca5a5', marginBottom: 8 }}>Edit failed</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{error}</p>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onRetry}
            style={{ marginTop: 16 }}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div style={surfaceStyle}>
      <div style={{ display: 'grid', gap: 12 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
          }}
        >
          <figure style={{ margin: 0, display: 'grid', gap: 6 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={originalUrl ?? result.originalUrl}
              alt="Original"
              style={{ width: '100%', borderRadius: 'var(--radius-md)' }}
            />
            <figcaption
              style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}
            >
              Original
            </figcaption>
          </figure>
          <figure style={{ margin: 0, display: 'grid', gap: 6 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={result.editedUrl}
              alt={result.prompt}
              style={{ width: '100%', borderRadius: 'var(--radius-md)' }}
            />
            <figcaption
              style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}
            >
              Edited
            </figcaption>
          </figure>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            color: 'var(--text-muted)',
            fontSize: 13,
          }}
        >
          <span>{Math.round(result.ms / 100) / 10}s</span>
          <a
            href={result.editedUrl}
            download={result.filename}
            className="btn btn-ghost"
          >
            Download
          </a>
        </div>
      </div>
    </div>
  );
}
