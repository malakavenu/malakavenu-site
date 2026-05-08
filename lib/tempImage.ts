import { setEx, getString, del, kvEnabled } from './kv';

/**
 * Ephemeral image store backed by Upstash Redis.
 *
 * Used by /api/edit-image to give Pollinations Kontext (or any third-party
 * image service) a temporary public URL pointing at a user-uploaded image.
 * Images are kept for `TEMP_IMAGE_TTL_SECONDS` (default 10 min) and then
 * vanish — Redis handles the cleanup on TTL expiry.
 *
 * Naming: keys live under the `tmp:img:<id>` namespace so they're easy to
 * inspect / purge if needed.
 */

export const TEMP_IMAGE_TTL_SECONDS = 600; // 10 min
const KEY_PREFIX = 'tmp:img:';
const META_PREFIX = 'tmp:img-meta:';

export type StoredImage = {
  id: string;
  contentType: string;
  bytes: ArrayBuffer;
  expiresAt: number; // epoch ms
};

export type StoredMeta = {
  contentType: string;
  expiresAt: number;
};

/**
 * Generate a short URL-safe id. Crypto-strong via the runtime's WebCrypto.
 */
function newId(): string {
  const arr = new Uint8Array(12);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function tempImageStorageEnabled(): boolean {
  return kvEnabled;
}

/**
 * Store an image. Returns the assigned id and absolute expiry timestamp.
 * The image bytes are base64-encoded inside Redis under one key, with a
 * sibling meta key holding the content-type.
 */
export async function storeTempImage(opts: {
  bytes: ArrayBuffer;
  contentType: string;
}): Promise<{ id: string; expiresAt: number } | null> {
  if (!kvEnabled) return null;
  const id = newId();
  const base64 = Buffer.from(opts.bytes).toString('base64');
  const expiresAt = Date.now() + TEMP_IMAGE_TTL_SECONDS * 1000;

  const okBody = await setEx(`${KEY_PREFIX}${id}`, base64, TEMP_IMAGE_TTL_SECONDS);
  if (!okBody) return null;
  const okMeta = await setEx(
    `${META_PREFIX}${id}`,
    JSON.stringify({ contentType: opts.contentType, expiresAt } as StoredMeta),
    TEMP_IMAGE_TTL_SECONDS,
  );
  if (!okMeta) {
    // Best-effort cleanup; swallow errors.
    void del(`${KEY_PREFIX}${id}`);
    return null;
  }
  return { id, expiresAt };
}

export async function loadTempImage(id: string): Promise<StoredImage | null> {
  if (!/^[a-z0-9]{16,32}$/i.test(id)) return null;
  const [base64, metaRaw] = await Promise.all([
    getString(`${KEY_PREFIX}${id}`),
    getString(`${META_PREFIX}${id}`),
  ]);
  if (!base64 || !metaRaw) return null;
  let meta: StoredMeta;
  try {
    meta = JSON.parse(metaRaw) as StoredMeta;
  } catch {
    return null;
  }
  const buffer = Buffer.from(base64, 'base64');
  return {
    id,
    contentType: meta.contentType,
    bytes: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer,
    expiresAt: meta.expiresAt,
  };
}

