import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { loadTempImage } from '@/lib/tempImage';

/**
 * /api/temp-image/[id] — public GET that streams a temp image back as bytes.
 *
 * No auth: the id is unguessable and the entry self-destructs after the TTL.
 * This URL is the one we hand to Pollinations Kontext so it can fetch the
 * user's uploaded image during img2img editing.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const image = await loadTempImage(id);
  if (!image) {
    return NextResponse.json({ error: 'Not found or expired.' }, { status: 404 });
  }

  return new Response(image.bytes, {
    status: 200,
    headers: {
      'Content-Type': image.contentType,
      'Cache-Control': 'public, max-age=300, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
