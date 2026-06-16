/**
 * Per-client rate limiting for the meme-studio API handlers.
 *
 * Uses the shared KV adapter (`lib/kv.ts`, Upstash/Vercel-KV REST) with a
 * sliding-window sorted set keyed by an anonymised client fingerprint — the
 * same pattern as `app/api/live/[slug]`. No PII is stored (only a short hash).
 *
 * When KV is not configured the limiter is a graceful no-op (requests are
 * always allowed), consistent with the rest of the app. Configure
 * KV_REST_URL / KV_REST_TOKEN (or the UPSTASH_* equivalents) in production to
 * actually enforce limits and protect the paid AI providers from abuse.
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { kvEnabled, zaddNow, zcountRecent, zremRangeByScore, expire } from '@/lib/kv';

export interface RateLimitRule {
  /** Stable bucket name, e.g. 'ideas' — namespaces the KV key. */
  name: string;
  /** Max requests allowed within the window. */
  limit: number;
  /** Sliding window length in milliseconds. */
  windowMs: number;
}

/** Default limits per endpoint. Tuned for an internal/low-traffic tool. */
export const RATE_LIMITS = {
  transcript: { name: 'transcript', limit: 30, windowMs: 5 * 60_000 },
  ideas: { name: 'ideas', limit: 20, windowMs: 5 * 60_000 },
  image: { name: 'image', limit: 30, windowMs: 5 * 60_000 },
  asset: { name: 'asset', limit: 15, windowMs: 5 * 60_000 },
} as const satisfies Record<string, RateLimitRule>;

function extractIp(req: NextRequest | Request): string {
  const h = 'headers' in req ? req.headers : new Headers();
  const fwd = h.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return h.get('x-real-ip') ?? 'anon';
}

/** Short, non-reversible per-client fingerprint (IP + UA + day). */
async function fingerprint(req: NextRequest | Request): Promise<string> {
  const ip = extractIp(req);
  const ua = ('headers' in req ? req.headers : new Headers()).get('user-agent') ?? '';
  const raw = `${ip}::${ua}::${new Date().toISOString().slice(0, 10)}`;
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(buf))
    .slice(0, 10)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Enforce a rate-limit rule for the given request. Returns a 429 NextResponse
 * when the client is over the limit, or `null` when the request may proceed.
 */
export async function enforceRateLimit(
  req: NextRequest,
  rule: RateLimitRule,
): Promise<NextResponse | null> {
  if (!kvEnabled) return null; // graceful no-op when KV is not configured

  let member: string;
  try {
    member = await fingerprint(req);
  } catch {
    return null; // never block on a fingerprinting failure
  }

  const key = `meme-studio:rl:${rule.name}:${member}`;
  await zremRangeByScore(key, rule.windowMs);
  const used = await zcountRecent(key, rule.windowMs);

  if (used >= rule.limit) {
    const retryAfterSec = Math.ceil(rule.windowMs / 1000);
    return NextResponse.json(
      {
        error: 'Too many requests. Please wait a moment and try again.',
        retryAfterSec,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSec),
          'X-RateLimit-Limit': String(rule.limit),
          'X-RateLimit-Remaining': '0',
        },
      },
    );
  }

  await zaddNow(key, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  await expire(key, Math.ceil(rule.windowMs / 1000) + 60);
  return null;
}
