import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { trackServer } from '@/lib/trackServer';

/**
 * Short-link redirector.
 *
 *   /r/linkedin                  -> SITE/?src=linkedin
 *   /r/linkedin?to=/articles     -> SITE/articles?src=linkedin
 *   /r/linkedin?to=%2Fresume     -> SITE/resume?src=linkedin
 *
 * The `src` param is captured by AttributionBoot on the landing page and
 * written into the `mv_attr` cookie (30-day first-touch). We also emit a
 * server-side `referral_visit` event so the hit shows up even if the
 * visitor bounces before client-side analytics mounts.
 *
 * Only same-origin paths are allowed as `?to=`. External URLs are dropped.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function safePath(to: string | null): string {
  if (!to) return '/';
  try {
    if (to.startsWith('/') && !to.startsWith('//')) {
      const decoded = decodeURIComponent(to);
      if (decoded.startsWith('/') && !decoded.startsWith('//')) return decoded;
    }
  } catch {
    // fall through
  }
  return '/';
}

function sanitizeSource(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40) || 'unknown';
}

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ source: string }> },
) {
  const { source } = await ctx.params;
  const src = sanitizeSource(source);
  const { searchParams, origin } = new URL(request.url);
  const path = safePath(searchParams.get('to'));

  const target = new URL(path, origin);
  target.searchParams.set('src', src);

  const utmMedium = searchParams.get('m');
  const utmCampaign = searchParams.get('c');
  if (utmMedium) target.searchParams.set('utm_medium', utmMedium);
  if (utmCampaign) target.searchParams.set('utm_campaign', utmCampaign);
  if (!target.searchParams.has('utm_source')) {
    target.searchParams.set('utm_source', src);
  }

  await trackServer('referral_visit', {
    source: src,
    to: path,
    utm_medium: utmMedium ?? null,
    utm_campaign: utmCampaign ?? null,
  });

  return NextResponse.redirect(target.toString(), { status: 302 });
}
