/**
 * Minimal KV adapter.
 *
 * Works with the Upstash Redis REST API (which Vercel KV also speaks —
 * same env vars). If neither `KV_REST_URL` nor `UPSTASH_REDIS_REST_URL`
 * is configured, every call is a graceful no-op so features that rely
 * on it (e.g. "reading now" counter) silently degrade.
 *
 * Swap to native Redis / Cloudflare KV / DynamoDB by editing this file.
 */

const URL_ENV =
  process.env.KV_REST_URL ??
  process.env.KV_REST_API_URL ??
  process.env.UPSTASH_REDIS_REST_URL ??
  '';

const TOKEN_ENV =
  process.env.KV_REST_TOKEN ??
  process.env.KV_REST_API_TOKEN ??
  process.env.UPSTASH_REDIS_REST_TOKEN ??
  '';

export const kvEnabled = Boolean(URL_ENV && TOKEN_ENV);

type UpstashResponse<T> = { result: T } | { error: string };

async function call<T>(command: (string | number)[]): Promise<T | null> {
  if (!kvEnabled) return null;
  try {
    const res = await fetch(URL_ENV, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN_ENV}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const body = (await res.json()) as UpstashResponse<T>;
    if ('error' in body) return null;
    return body.result;
  } catch {
    return null;
  }
}

/** Add a member to a sorted set with the current timestamp as score. */
export async function zaddNow(key: string, member: string): Promise<void> {
  const now = Date.now();
  await call<unknown>(['ZADD', key, now, member]);
}

/** Remove sorted-set members older than `ms` milliseconds. */
export async function zremRangeByScore(key: string, olderThanMs: number): Promise<void> {
  const cutoff = Date.now() - olderThanMs;
  await call<unknown>(['ZREMRANGEBYSCORE', key, 0, cutoff]);
}

/** Count members of a sorted set scored within the last `ms` milliseconds. */
export async function zcountRecent(key: string, withinMs: number): Promise<number> {
  const from = Date.now() - withinMs;
  const result = await call<number>(['ZCOUNT', key, from, '+inf']);
  return typeof result === 'number' ? result : 0;
}

export async function expire(key: string, seconds: number): Promise<void> {
  await call<unknown>(['EXPIRE', key, seconds]);
}

export async function incrBy(key: string, by = 1): Promise<number | null> {
  return call<number>(['INCRBY', key, by]);
}

/** Set a string value with TTL (seconds). Returns true on success. */
export async function setEx(key: string, value: string, ttlSeconds: number): Promise<boolean> {
  const result = await call<string>(['SET', key, value, 'EX', ttlSeconds]);
  return result === 'OK';
}

/** Get a raw string value or null if missing/expired. */
export async function getString(key: string): Promise<string | null> {
  const result = await call<string | null>(['GET', key]);
  return typeof result === 'string' ? result : null;
}

/** Delete a key. Best-effort, ignores result. */
export async function del(key: string): Promise<void> {
  await call<unknown>(['DEL', key]);
}
