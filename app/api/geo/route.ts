import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getVisitorGeo, countryFlag } from '@/lib/visitorGeo';

/**
 * Returns the visitor's country/city when available from the hosting
 * provider's edge headers (Vercel, Cloudflare, Netlify). Used only for a
 * friendly "Hi from X" greeting — not stored anywhere.
 */
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const geo = getVisitorGeo(req);
  return NextResponse.json({
    country: geo.country,
    city: geo.city,
    region: geo.region,
    flag: geo.country ? countryFlag(geo.country) : null,
  });
}
