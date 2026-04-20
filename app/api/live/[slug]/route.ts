import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { kvEnabled, zaddNow, zcountRecent, zremRangeByScore, expire } from '@/lib/kv';

/**
 * POST  /api/live/[slug]  → registers a heartbeat and returns `count`.
 * GET   /api/live/[slug]  → returns the current `count` without writing.
 *
 * Uses a 5-minute sliding window on a sorted set keyed by anonymised
 * client IP hash (no PII stored — only a SHA-style fingerprint).
 *
 * If no KV is configured, returns { count: 0, enabled: false } so the
 * client-side badge simply stays hidden and nothing breaks.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WINDOW_MS = 5 * 60 * 1000;
const KEY_TTL_SECONDS = 60 * 60;

function sanitizeSlug(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 80);
}

function extractIp(req: NextRequest | Request): string {
  const h = 'headers' in req ? req.headers : new Headers();
  const fwd = h.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return h.get('x-real-ip') ?? 'anon';
}

async function fingerprint(req: NextRequest | Request): Promise<string> {
  const ip = extractIp(req);
  const ua = ('headers' in req ? req.headers : new Headers()).get('user-agent') ?? '';
  const raw = `${ip}::${ua}::${new Date().toISOString().slice(0, 10)}`;
  const enc = new TextEncoder().encode(raw);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf))
    .slice(0, 10)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function countFor(slug: string): Promise<number> {
  const key = `live:${slug}`;
  await zremRangeByScore(key, WINDOW_MS);
  return zcountRecent(key, WINDOW_MS);
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug: rawSlug } = await ctx.params;
  const slug = sanitizeSlug(rawSlug);
  if (!slug) return NextResponse.json({ count: 0, enabled: kvEnabled }, { status: 400 });

  if (!kvEnabled) return NextResponse.json({ count: 0, enabled: false });

  const key = `live:${slug}`;
  const member = await fingerprint(req);
  await zaddNow(key, member);
  await expire(key, KEY_TTL_SECONDS);
  const count = await countFor(slug);
  return NextResponse.json({ count, enabled: true });
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug: rawSlug } = await ctx.params;
  const slug = sanitizeSlug(rawSlug);
  if (!slug) return NextResponse.json({ count: 0, enabled: kvEnabled }, { status: 400 });

  if (!kvEnabled) return NextResponse.json({ count: 0, enabled: false });

  const count = await countFor(slug);
  return NextResponse.json({ count, enabled: true });
}
