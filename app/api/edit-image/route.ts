import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * /api/edit-image — image-to-image (Kontext-style) editing.
 *
 * The user-uploaded image lives at a temporary public URL produced by
 * /api/upload-temp-image. This route just hands the URL + prompt to
 * Pollinations Kontext, which fetches the image and returns the edit.
 *
 * Two endpoints are tried in order:
 *   1. gen.pollinations.ai with POLLINATIONS_API_KEY (premium tier — costs ~0.1 pollen)
 *   2. image.pollinations.ai legacy keyless host (when Kontext is reachable there)
 *
 * Note: in local dev, Pollinations cannot fetch images at http://localhost.
 * Edit mode therefore only fully works in deployed environments (where the
 * temp URL is publicly reachable).
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 90;

const GEN_BASE = 'https://gen.pollinations.ai';
const LEGACY_IMAGE = 'https://image.pollinations.ai';
const KONTEXT_MODEL = 'kontext';
const MAX_PROMPT = 500;

type Body = {
  imageUrl?: unknown;
  prompt?: unknown;
  width?: unknown;
  height?: unknown;
};

function sanitizePrompt(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_PROMPT);
}

function clampDim(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1536, Math.max(256, Math.round(n)));
}

function isAcceptableImageUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const u = new URL(value);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    return true;
  } catch {
    return false;
  }
}

async function tryEndpoint(
  base: string,
  params: URLSearchParams,
  prompt: string,
  withAuth: boolean,
): Promise<{ ok: true; res: Response } | { ok: false; status: number; detail: string }> {
  const url = `${base}/${base === GEN_BASE ? 'image' : 'prompt'}/${encodeURIComponent(prompt)}?${params}`;
  const headers: Record<string, string> = { Accept: 'image/jpeg' };
  if (withAuth) {
    const key = process.env.POLLINATIONS_API_KEY?.trim();
    if (key) headers.Authorization = `Bearer ${key}`;
  }

  const res = await fetch(url, { method: 'GET', headers });
  const ct = res.headers.get('content-type') || '';
  if (res.ok && ct.startsWith('image/')) {
    return { ok: true, res };
  }
  let detail = `${res.status} ${res.statusText}`;
  try {
    const text = await res.text();
    if (text) detail += ` — ${text.slice(0, 240)}`;
  } catch {
    // ignore
  }
  return { ok: false, status: res.status, detail };
}

export async function POST(req: NextRequest) {
  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const prompt = sanitizePrompt(body.prompt);
  if (!prompt) {
    return NextResponse.json(
      { error: 'A prompt of 1–500 characters is required.' },
      { status: 400 },
    );
  }

  if (!isAcceptableImageUrl(body.imageUrl)) {
    return NextResponse.json(
      { error: 'Please re-upload your image and try again.' },
      { status: 400 },
    );
  }

  const width = clampDim(body.width, 1024);
  const height = clampDim(body.height, 1024);
  const imageUrl = body.imageUrl as string;

  const baseParams = new URLSearchParams({
    model: KONTEXT_MODEL,
    image: imageUrl,
    width: String(width),
    height: String(height),
    nologo: 'true',
    referrer: 'malakavenu.com',
  });

  // Attempt 1 — premium endpoint with API key (better quality, costs pollen).
  const hasKey = Boolean(process.env.POLLINATIONS_API_KEY?.trim());
  const errors: string[] = [];

  if (hasKey) {
    const r = await tryEndpoint(GEN_BASE, baseParams, prompt, true);
    if (r.ok) {
      return forwardImage(r.res, 'pollinations-keyed');
    }
    errors.push(`gen.pollinations.ai → ${r.detail}`);
    if (r.status === 402 || r.status === 401) {
      return NextResponse.json(
        {
          error:
            'AI restyle is temporarily unavailable. Please try again later, or use Free filters for an instant restyle.',
        },
        { status: 503 },
      );
    }
  }

  const legacy = await tryEndpoint(LEGACY_IMAGE, baseParams, prompt, false);
  if (legacy.ok) {
    return forwardImage(legacy.res, 'pollinations-legacy');
  }
  errors.push(`image.pollinations.ai → ${legacy.detail}`);

  // Detail string is captured server-side for logs; not surfaced to the user.
  console.warn('[edit-image] upstream failures:', errors.join(' | '));

  return NextResponse.json(
    {
      error:
        'AI restyle is temporarily unavailable. Please try again later, or use Free filters for an instant restyle.',
    },
    { status: 503 },
  );
}

async function forwardImage(upstream: Response, provider: string) {
  const buffer = await upstream.arrayBuffer();
  return new Response(buffer, {
    status: 200,
    headers: {
      'Content-Type': upstream.headers.get('content-type') || 'image/jpeg',
      'Cache-Control': 'no-store',
      'X-Image-Provider': provider,
      'X-Image-Model': KONTEXT_MODEL,
    },
  });
}
