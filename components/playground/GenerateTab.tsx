'use client';

import { useEffect, useRef, useState } from 'react';
import { track } from '@/lib/track';
import { Spinner } from './Spinner';
import { chipStyle, selectStyle, subtleNote, surfaceStyle, textareaStyle } from './playgroundStyles';

const MODELS = [
  { id: 'flux', label: 'Standard · balanced' },
  { id: 'gptimage-2', label: 'High quality · slower' },
  { id: 'seedream', label: 'Artistic · stylised' },
  { id: 'turbo', label: 'Turbo · fastest' },
] as const;

type ModelId = (typeof MODELS)[number]['id'];

const COUNT_OPTIONS = [
  { value: 1, label: '1 image' },
  { value: 4, label: '4 variations' },
] as const;

const SAMPLES = [
  'A cinematic portrait of an Indian software architect at a glass desk in Bangalore, neon city lights through floor-to-ceiling windows, depth of field, photoreal, 35mm',
  'Isometric illustration of a multi-agent AI system, glowing nodes connected by violet and cyan light trails, dark background, ultra-detailed, vector',
  'A minimal product banner for an AI engineering portfolio: gradient mesh of violet, cyan and pink, soft grain, abstract shapes, premium magazine style',
  'A friendly mascot for a developer blog, flat vector, holding a laptop emitting sparkling code, pastel violet and cyan palette, sticker style',
];

const MAX_PROMPT = 500;

type GenStatus = 'idle' | 'enhancing' | 'generating' | 'done' | 'error';

type GeneratedImage = { url: string; seed: number; provider: string; filename: string };

export function GenerateTab() {
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState<ModelId>('flux');
  const [count, setCount] = useState<1 | 4>(1);
  const [status, setStatus] = useState<GenStatus>('idle');
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ ms: number; provider: string; model: string } | null>(null);

  const objectUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      objectUrlsRef.current = [];
    };
  }, []);

  function resetUrls() {
    objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    objectUrlsRef.current = [];
  }

  async function enhance() {
    const trimmed = prompt.trim();
    if (!trimmed || status === 'enhancing' || status === 'generating') return;
    setStatus('enhancing');
    setError(null);
    track('playground_enhance_prompt', { len: trimmed.length });
    try {
      const res = await fetch('/api/enhance-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: trimmed }),
      });
      const data = (await res.json()) as { prompt?: string; error?: string };
      if (!res.ok || !data.prompt) {
        throw new Error(data.error || `Enhance failed (${res.status}).`);
      }
      setPrompt(data.prompt.slice(0, MAX_PROMPT));
      setStatus('idle');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not enhance prompt.');
      setStatus('error');
    }
  }

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed || status === 'generating') return;

    setStatus('generating');
    setError(null);
    setImages([]);
    setMeta(null);
    resetUrls();

    const startedAt = performance.now();
    track('playground_generate', { model, count, prompt_len: trimmed.length });

    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: trimmed, model, count }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}) as { error?: string });
        throw new Error(data?.error || `Request failed (${res.status}).`);
      }

      const ms = Math.round(performance.now() - startedAt);
      const ct = res.headers.get('content-type') || '';
      const stamp = Date.now();

      if (ct.startsWith('image/')) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        objectUrlsRef.current.push(url);
        const seed = Number(res.headers.get('X-Image-Seed')) || stamp;
        setImages([
          {
            url,
            seed,
            provider: res.headers.get('X-Image-Provider') || 'pollinations',
            filename: `malakavenu-${seed}.png`,
          },
        ]);
        setMeta({
          ms,
          provider: res.headers.get('X-Image-Provider') || 'pollinations',
          model: res.headers.get('X-Image-Model') || model,
        });
      } else {
        const data = (await res.json()) as {
          images: Array<{ dataUrl: string; seed: number; provider: string }>;
        };
        setImages(
          data.images.map((img, i) => ({
            url: img.dataUrl,
            seed: img.seed,
            provider: img.provider,
            filename: `malakavenu-${img.seed || stamp + i}.png`,
          })),
        );
        setMeta({ ms, provider: data.images[0]?.provider || 'pollinations', model });
      }

      setStatus('done');
      track('playground_generate_success', { model, count, ms });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      setError(message);
      setStatus('error');
      track('playground_generate_error', { model, message });
    }
  }

  const isBusy = status === 'generating' || status === 'enhancing';

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <form onSubmit={submit} style={{ display: 'grid', gap: 16 }}>
        <div style={{ display: 'grid', gap: 8 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <label htmlFor="pg-prompt" style={{ fontWeight: 600, color: 'var(--text)' }}>
              Prompt
            </label>
            <button
              type="button"
              onClick={enhance}
              disabled={!prompt.trim() || isBusy}
              className="btn btn-ghost"
              style={{ padding: '6px 12px', fontSize: 12 }}
              title="Use AI to expand your idea into a richly detailed prompt"
            >
              {status === 'enhancing' ? 'Enhancing…' : '✨ Enhance prompt'}
            </button>
          </div>
          <textarea
            id="pg-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value.slice(0, MAX_PROMPT))}
            placeholder="Describe the image you want…"
            rows={4}
            maxLength={MAX_PROMPT}
            disabled={isBusy}
            style={textareaStyle}
          />
        </div>

        <div
          style={{
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value as ModelId)}
              disabled={isBusy}
              aria-label="Model"
              style={selectStyle}
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value) as 1 | 4)}
              disabled={isBusy}
              aria-label="Count"
              style={selectStyle}
            >
              {COUNT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
              {prompt.length}/{MAX_PROMPT}
            </span>
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!prompt.trim() || isBusy}
            style={{ minWidth: 160 }}
          >
            {status === 'generating'
              ? count > 1
                ? `Generating ${count}…`
                : 'Generating…'
              : count > 1
                ? `Generate ${count}`
                : 'Generate image'}
          </button>
        </div>
      </form>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {SAMPLES.map((p, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setPrompt(p)}
            disabled={isBusy}
            style={chipStyle}
          >
            {p.length > 56 ? `${p.slice(0, 56)}…` : p}
          </button>
        ))}
      </div>

      <div style={{ ...surfaceStyle, display: 'grid', placeItems: 'center' }}>
        {status === 'idle' && (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', maxWidth: 420 }}>
            Your generated image will appear here. Pick a sample prompt above, hit ✨ Enhance to
            polish it, then choose a model and Generate.
          </p>
        )}

        {status === 'enhancing' && (
          <div style={{ textAlign: 'center', display: 'grid', gap: 12 }}>
            <Spinner label="Enhancing prompt" />
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
              Polishing your idea into a richly detailed prompt…
            </p>
          </div>
        )}

        {status === 'generating' && (
          <div style={{ textAlign: 'center', display: 'grid', gap: 12 }}>
            <Spinner label="Generating image" />
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
              {count > 1
                ? `Generating ${count} variations in parallel… 5–25 s.`
                : 'Calling the model… 3–15 s on the free tier.'}
            </p>
          </div>
        )}

        {status === 'error' && (
          <div style={{ textAlign: 'center', maxWidth: 480 }}>
            <p style={{ color: '#fca5a5', marginBottom: 8 }}>Something went wrong</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{error}</p>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => submit()}
              style={{ marginTop: 16 }}
            >
              Try again
            </button>
          </div>
        )}

        {status === 'done' && images.length > 0 && (
          <div style={{ width: '100%', display: 'grid', gap: 12 }}>
            {images.length === 1 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={images[0].url}
                alt={prompt}
                style={{ width: '100%', borderRadius: 'var(--radius-md)' }}
              />
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 12,
                }}
              >
                {images.map((img, i) => (
                  <a
                    key={i}
                    href={img.url}
                    download={img.filename}
                    onClick={() =>
                      track('playground_image_download', {
                        model: meta?.model ?? null,
                        index: i,
                        of: images.length,
                      })
                    }
                    style={{
                      display: 'block',
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                      border: '1px solid var(--border)',
                      transition: 'transform 200ms var(--ease)',
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt={`${prompt} — variation ${i + 1}`} style={{ width: '100%', display: 'block' }} />
                  </a>
                ))}
              </div>
            )}

            {meta && (
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
                <span>
                  <strong style={{ color: 'var(--text-soft)' }}>{meta.model}</strong> ·{' '}
                  {Math.round(meta.ms / 100) / 10}s
                </span>
                {images.length === 1 && (
                  <a
                    href={images[0].url}
                    download={images[0].filename}
                    className="btn btn-ghost"
                    onClick={() =>
                      track('playground_image_download', {
                        model: meta?.model ?? null,
                        index: 0,
                        of: 1,
                      })
                    }
                  >
                    Download
                  </a>
                )}
                {images.length > 1 && (
                  <span style={{ color: 'var(--text-muted)' }}>Click any tile to download.</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <p style={subtleNote}>
        Free to use. Generated images are not stored on our servers.
      </p>
    </div>
  );
}
