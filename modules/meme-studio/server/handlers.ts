import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMemeStudioConfig } from '../config';
import { defaultLogger } from '../adapters/env';
import type {
  AssetGenRequestBody,
  IdeasRequestBody,
  ImageRequestBody,
  Language,
  MemeAsset,
  MemeTone,
  TargetParty,
  TranscriptRequestBody,
} from '../types';
import { fetchYoutubeTranscript } from './youtube';
import {
  buildImageProviders,
  buildTextProviders,
  withFallback,
} from './providers';
import { enforceRateLimit, RATE_LIMITS } from './rate-limit';

const VALID_TONES: MemeTone[] = ['satirical', 'celebratory', 'sarcastic', 'wholesome', 'savage'];
const VALID_TARGETS: TargetParty[] = ['tdp', 'janasena', 'bjp', 'kutami', 'general'];

/** Upper bound on a pasted transcript before we slice it (defensive size cap). */
const MAX_TRANSCRIPT_CHARS = 50_000;
/** Caps on the knownLeaders array sent from the client. */
const MAX_KNOWN_LEADERS = 50;
const MAX_LEADER_ID_LEN = 80;
/** Caps on asset tags. */
const MAX_ASSET_TAGS = 12;
const MAX_ASSET_TAG_LEN = 40;

/** True on read-only / serverless hosts where writing into public/ will fail. */
function isReadOnlyFs(): boolean {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}
const ASSET_CATEGORIES: MemeAsset['category'][] = [
  'symbols',
  'bubbles',
  'stickers',
  'stamps',
  'banners',
];

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'asset'
  );
}

/** A style suffix that nudges the model toward a clean, cut-out sticker. */
function stickerPrompt(prompt: string, category: MemeAsset['category']): string {
  const base = prompt.trim();
  if (category === 'banners') {
    return `${base}. Wide decorative banner graphic, vector poster style, vivid colors, no text, isolated on a plain transparent background.`;
  }
  return `${base}. Single centered sticker, bold flat vector illustration, thick clean outline, vibrant colors, die-cut style, no text, isolated on a plain transparent background.`;
}

/** POST /api/meme-studio/transcript — { url } or { text } → TranscriptResult */
export async function handleTranscript(req: NextRequest): Promise<NextResponse> {
  const limited = await enforceRateLimit(req, RATE_LIMITS.transcript);
  if (limited) return limited;

  let body: TranscriptRequestBody;
  try {
    body = (await req.json()) as TranscriptRequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (typeof body.text === 'string' && body.text.trim().length > 20) {
    const text = body.text.trim().slice(0, MAX_TRANSCRIPT_CHARS);
    return NextResponse.json({
      videoId: '',
      source: 'pasted',
      segments: [{ text, offsetSec: 0, durationSec: 0 }],
      text,
    });
  }

  if (!body.url || typeof body.url !== 'string') {
    return NextResponse.json(
      { error: 'Provide a YouTube `url` or pasted `text`.' },
      { status: 400 },
    );
  }

  try {
    const result = await fetchYoutubeTranscript(body.url);
    return NextResponse.json(result);
  } catch (err) {
    defaultLogger.warn('transcript fetch failed', { error: (err as Error).message });
    return NextResponse.json(
      {
        error: (err as Error).message,
        hint: 'You can paste the transcript text manually instead.',
      },
      { status: 422 },
    );
  }
}

/** POST /api/meme-studio/ideas — IdeasRequestBody → { concepts, provider, model } */
export async function handleIdeas(req: NextRequest): Promise<NextResponse> {
  const limited = await enforceRateLimit(req, RATE_LIMITS.ideas);
  if (limited) return limited;

  let raw: Partial<IdeasRequestBody>;
  try {
    raw = (await req.json()) as Partial<IdeasRequestBody>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const transcript = typeof raw.transcript === 'string' ? raw.transcript.trim() : '';
  if (transcript.length < 20) {
    return NextResponse.json(
      { error: 'A transcript of at least 20 characters is required.' },
      { status: 400 },
    );
  }

  const language: Language | 'both' =
    raw.language === 'en' || raw.language === 'te' || raw.language === 'both'
      ? raw.language
      : 'both';
  const tone: MemeTone = VALID_TONES.includes(raw.tone as MemeTone)
    ? (raw.tone as MemeTone)
    : 'satirical';
  const target: TargetParty = VALID_TARGETS.includes(raw.target as TargetParty)
    ? (raw.target as TargetParty)
    : 'kutami';
  const count = Math.min(8, Math.max(1, Number(raw.count) || 4));
  const knownLeaders = Array.isArray(raw.knownLeaders)
    ? raw.knownLeaders
        .filter((l): l is string => typeof l === 'string')
        .map((l) => l.slice(0, MAX_LEADER_ID_LEN))
        .slice(0, MAX_KNOWN_LEADERS)
    : [];
  const focusIssues = Array.isArray(raw.focusIssues)
    ? raw.focusIssues.filter((l): l is string => typeof l === 'string').slice(0, 4)
    : undefined;

  const body: IdeasRequestBody = {
    transcript: transcript.slice(0, 12000),
    language,
    tone,
    target,
    count,
    knownLeaders,
    focusIssues,
  };

  const config = createMemeStudioConfig();
  const providers = buildTextProviders(config);
  if (!providers.length) {
    return NextResponse.json({ error: 'No caption providers configured.' }, { status: 503 });
  }

  try {
    const { result, provider } = await withFallback(providers, (p) => p.generateConcepts(body));
    return NextResponse.json({ concepts: result, provider: provider.id, model: provider.model });
  } catch (err) {
    defaultLogger.error('ideas generation failed', { error: (err as Error).message });
    return NextResponse.json(
      { error: 'Could not generate meme ideas right now. Please try again.' },
      { status: 502 },
    );
  }
}

/** POST /api/meme-studio/image — ImageRequestBody → image bytes */
export async function handleImage(req: NextRequest): Promise<Response> {
  const limited = await enforceRateLimit(req, RATE_LIMITS.image);
  if (limited) return limited;

  let body: ImageRequestBody;
  try {
    body = (await req.json()) as ImageRequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const prompt = typeof body.prompt === 'string' ? body.prompt.trim().slice(0, 800) : '';
  if (!prompt) {
    return NextResponse.json({ error: 'A `prompt` is required.' }, { status: 400 });
  }
  const clamp = (v: unknown, d: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(1536, Math.max(256, Math.round(n))) : d;
  };
  const width = clamp(body.width, 1024);
  const height = clamp(body.height, 1024);

  const config = createMemeStudioConfig();
  const providers = buildImageProviders(config);
  if (!providers.length) {
    return NextResponse.json({ error: 'No image providers configured.' }, { status: 503 });
  }

  try {
    const { result, provider } = await withFallback(providers, (p) =>
      p.generateImage({ prompt, width, height, transparent: Boolean(body.transparent) }),
    );
    return new Response(result.bytes, {
      status: 200,
      headers: {
        'Content-Type': result.contentType,
        'Cache-Control': 'no-store',
        'X-Meme-Provider': provider.id,
        'X-Meme-Model': provider.model,
      },
    });
  } catch (err) {
    defaultLogger.error('image generation failed', { error: (err as Error).message });
    return NextResponse.json(
      { error: 'Image generation is temporarily unavailable. Please try again.' },
      { status: 502 },
    );
  }
}

/**
 * POST /api/meme-studio/asset — generate a sticker/symbol/illustration with the
 * image model and SAVE it into the public library + manifest so it persists.
 *
 * Note: writes to public/meme-studio/assets on the local filesystem. Intended
 * for local authoring (same model as `npm run meme-studio:reindex`); on a
 * read-only/serverless host the write will fail and return 500.
 */
export async function handleAsset(req: NextRequest): Promise<NextResponse> {
  // This route persists files into public/ — only possible on a writable disk.
  // On serverless/read-only hosts, fail fast with a clear, correct status.
  if (isReadOnlyFs()) {
    return NextResponse.json(
      {
        error:
          'Asset generation requires a writable filesystem and is disabled on this host. Run it locally (same as `npm run meme-studio:reindex`).',
      },
      { status: 501 },
    );
  }

  const limited = await enforceRateLimit(req, RATE_LIMITS.asset);
  if (limited) return limited;

  let body: AssetGenRequestBody;
  try {
    body = (await req.json()) as AssetGenRequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const prompt = typeof body.prompt === 'string' ? body.prompt.trim().slice(0, 600) : '';
  if (!prompt) {
    return NextResponse.json({ error: 'A `prompt` is required.' }, { status: 400 });
  }
  const category: MemeAsset['category'] = ASSET_CATEGORIES.includes(body.category)
    ? body.category
    : 'stickers';
  const transparent = body.transparent !== false;
  const tags = Array.isArray(body.tags)
    ? body.tags
        .filter((t): t is string => typeof t === 'string')
        .map((t) => t.trim().slice(0, MAX_ASSET_TAG_LEN))
        .filter(Boolean)
        .slice(0, MAX_ASSET_TAGS)
    : [];

  const config = createMemeStudioConfig();
  const providers = buildImageProviders(config);
  if (!providers.length) {
    return NextResponse.json({ error: 'No image providers configured.' }, { status: 503 });
  }

  try {
    const { result, provider } = await withFallback(providers, (p) =>
      p.generateImage({
        prompt: stickerPrompt(prompt, category),
        width: 1024,
        height: 1024,
        transparent,
      }),
    );

    const ext = result.contentType.includes('svg')
      ? 'svg'
      : result.contentType.includes('png')
        ? 'png'
        : 'jpg';
    const file = `${slugify(prompt)}-${randomUUID().slice(0, 8)}.${ext}`;
    const dir = join(process.cwd(), 'public', 'meme-studio', 'assets', category);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, file), Buffer.from(result.bytes));

    // Read-modify-write the manifest.
    const manifestPath = join(process.cwd(), 'public', 'meme-studio', 'assets', 'manifest.json');
    let assets: MemeAsset[] = [];
    try {
      const raw = await readFile(manifestPath, 'utf8');
      const parsed = JSON.parse(raw) as { assets?: MemeAsset[] };
      assets = Array.isArray(parsed.assets) ? parsed.assets : [];
    } catch {
      assets = [];
    }
    const asset: MemeAsset = {
      id: `${category}-${slugify(prompt)}-${randomUUID().slice(0, 6)}`,
      category,
      file,
      tags: tags.length ? tags : [category, slugify(prompt)],
    };
    assets.push(asset);
    await writeFile(manifestPath, `${JSON.stringify({ assets }, null, 2)}\n`);

    return NextResponse.json({
      asset,
      url: `${config.basePath}/assets/${category}/${file}`,
      provider: provider.id,
      model: provider.model,
    });
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    const isFsError = code === 'EROFS' || code === 'EACCES' || code === 'ENOSPC' || code === 'ENOENT';
    defaultLogger.error('asset generation failed', { error: (err as Error).message, code });
    return NextResponse.json(
      {
        error: isFsError
          ? 'Could not save the asset to disk on this host.'
          : 'Could not generate that asset. Please try again.',
      },
      { status: isFsError ? 503 : 502 },
    );
  }
}
