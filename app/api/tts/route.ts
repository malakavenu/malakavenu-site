import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { textToSpeech, POLLINATIONS_VOICES } from '@/lib/pollinations';

/**
 * /api/tts — text-to-speech via Pollinations.
 *
 * POST { text: string, voice?: string }  → audio/mpeg stream
 * Used by the "Listen to this article" button on blog posts and by the
 * playground voice demo.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_TEXT_CHARS = 4_000;
const VOICES = new Set<string>(POLLINATIONS_VOICES);

type Body = { text?: unknown; voice?: unknown };

export async function POST(req: NextRequest) {
  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text) {
    return NextResponse.json({ error: '`text` is required.' }, { status: 400 });
  }

  const trimmed = text.slice(0, MAX_TEXT_CHARS);
  const voice = typeof body.voice === 'string' && VOICES.has(body.voice) ? body.voice : 'nova';

  let upstream: Response;
  try {
    upstream = await textToSpeech({
      text: trimmed,
      voice: voice as (typeof POLLINATIONS_VOICES)[number],
    });
  } catch (err) {
    console.warn('[tts] init failure:', err);
    return NextResponse.json(
      { error: 'Audio is temporarily unavailable. Please try again later.' },
      { status: 503 },
    );
  }

  if (!upstream.ok) {
    let detail = `${upstream.status} ${upstream.statusText}`;
    try {
      const t = await upstream.text();
      if (t) detail += ` — ${t.slice(0, 200)}`;
    } catch {
      // ignore
    }
    console.warn('[tts] upstream failure:', detail);
    return NextResponse.json(
      { error: 'Audio is temporarily unavailable. Please try again later.' },
      { status: 502 },
    );
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': upstream.headers.get('content-type') || 'audio/mpeg',
      'Cache-Control': 'public, max-age=86400, immutable',
      'X-TTS-Voice': voice,
    },
  });
}
