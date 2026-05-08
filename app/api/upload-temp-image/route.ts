import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  storeTempImage,
  tempImageStorageEnabled,
  TEMP_IMAGE_TTL_SECONDS,
} from '@/lib/tempImage';

/**
 * /api/upload-temp-image — accept a user-uploaded image (multipart/form-data)
 * and stash it in Upstash for ~10 minutes so a third-party image service
 * (Pollinations Kontext, etc.) can fetch it via a public URL.
 *
 * Response: { id, url, expiresAt } — the `url` is reachable from the public
 * internet when SITE_URL is configured.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const MAX_BYTES = 1_500_000; // ~1.5 MB. Client-side compression keeps real-world uploads ≪ this.
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

function publicOrigin(req: NextRequest): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, '');
  // Fall back to the request's own origin (works for production deploys
  // where SITE_URL isn't set, and for local dev).
  const proto = req.headers.get('x-forwarded-proto') || 'http';
  const host = req.headers.get('host') || 'localhost:3000';
  return `${proto}://${host}`;
}

export async function POST(req: NextRequest) {
  if (!tempImageStorageEnabled()) {
    console.warn('[upload-temp-image] storage disabled — UPSTASH_REDIS_REST_URL/_TOKEN missing');
    return NextResponse.json(
      { error: 'Image upload is temporarily unavailable. Please try again later.' },
      { status: 503 },
    );
  }

  if (!(req.headers.get('content-type') || '').includes('multipart/form-data')) {
    return NextResponse.json(
      { error: 'Please re-upload your image and try again.' },
      { status: 400 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Could not parse upload.' }, { status: 400 });
  }

  const file = form.get('image');
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'Please pick an image to upload.' }, { status: 400 });
  }

  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: 'Image must be JPEG, PNG, or WebP.' },
      { status: 415 },
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      {
        error: `Image is too large after compression (${Math.round(
          file.size / 1024,
        )} KB). Try a smaller source image.`,
      },
      { status: 413 },
    );
  }

  const bytes = await file.arrayBuffer();

  const stored = await storeTempImage({ bytes, contentType: file.type });
  if (!stored) {
    return NextResponse.json(
      { error: 'Could not store the image. Please retry in a moment.' },
      { status: 502 },
    );
  }

  const url = `${publicOrigin(req)}/api/temp-image/${stored.id}`;
  return NextResponse.json({
    id: stored.id,
    url,
    expiresAt: stored.expiresAt,
    ttlSeconds: TEMP_IMAGE_TTL_SECONDS,
  });
}
