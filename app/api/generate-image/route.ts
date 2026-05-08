import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { generateImage, POLLINATIONS_IMAGE_MODELS } from '@/lib/pollinations';

/**
 * /api/generate-image — text-to-image generation.
 *
 * POST { prompt, model?, width?, height?, count?, seed? }
 *
 * Two response modes:
 *   - count = 1 (default): raw image bytes (image/jpeg) for backwards compat
 *   - count > 1: JSON { images: [{ dataUrl, seed, provider }] }
 *
 * Provider stack (in lib/pollinations.ts):
 *   1. gen.pollinations.ai with POLLINATIONS_API_KEY → premium models
 *   2. image.pollinations.ai legacy keyless → FLUX fallback
 *
 * Hugging Face was previously chained here; removed because HF migrated
 * its inference router and the free tier no longer hosts FLUX models we use.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_PROMPT_LEN = 500;
const MAX_COUNT = 4;
const ALLOWED_MODELS: Set<string> = new Set(POLLINATIONS_IMAGE_MODELS.map((m) => m.id));

type Body = {
  prompt?: unknown;
  model?: unknown;
  width?: unknown;
  height?: unknown;
  count?: unknown;
  seed?: unknown;
};

function sanitizePrompt(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_PROMPT_LEN);
}

function clampDim(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1536, Math.max(256, Math.round(n)));
}

function clampCount(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.min(MAX_COUNT, Math.max(1, Math.round(n)));
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

  const model =
    typeof body.model === 'string' && ALLOWED_MODELS.has(body.model) ? body.model : 'flux';
  const width = clampDim(body.width, 1024);
  const height = clampDim(body.height, 1024);
  const count = clampCount(body.count);
  const baseSeed =
    Number.isFinite(Number(body.seed)) && Number(body.seed) >= 0
      ? Number(body.seed)
      : Math.floor(Math.random() * 1_000_000);

  if (count === 1) {
    const { response, provider } = await generateImage({
      prompt,
      model,
      width,
      height,
      seed: baseSeed,
    });
    if (!response.ok) {
      console.warn('[generate-image] upstream non-OK:', response.status, provider);
      return NextResponse.json(
        { error: 'Image generation is temporarily unavailable. Please try again.' },
        { status: 502 },
      );
    }
    const buffer = await response.arrayBuffer();
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'image/jpeg',
        'Cache-Control': 'no-store',
        'X-Image-Provider': provider,
        'X-Image-Model': model,
        'X-Image-Seed': String(baseSeed),
      },
    });
  }

  // Batch — fan out N requests in parallel with different seeds, return data URLs.
  const seeds = Array.from({ length: count }, (_, i) => baseSeed + i * 1009);
  const results = await Promise.all(
    seeds.map(async (seed) => {
      try {
        const { response, provider } = await generateImage({
          prompt,
          model,
          width,
          height,
          seed,
        });
        if (!response.ok) return null;
        const ct = response.headers.get('content-type') || 'image/jpeg';
        const ab = await response.arrayBuffer();
        const base64 = Buffer.from(ab).toString('base64');
        return { dataUrl: `data:${ct};base64,${base64}`, seed, provider };
      } catch {
        return null;
      }
    }),
  );

  const images = results.filter((r): r is NonNullable<typeof r> => Boolean(r));
  if (!images.length) {
    return NextResponse.json(
      { error: 'All image generations failed. Try again in a moment.' },
      { status: 502 },
    );
  }

  return NextResponse.json({ images, model, prompt });
}
