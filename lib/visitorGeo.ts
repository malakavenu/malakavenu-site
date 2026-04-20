/**
 * Visitor geo helper.
 *
 * Currently reads Vercel's edge geo headers. To host elsewhere, swap the
 * header names (Cloudflare: cf-ipcountry, Netlify: x-nf-geo) — only this
 * file changes.
 */
import type { NextRequest } from 'next/server';

export type VisitorGeo = {
  country: string | null;
  city: string | null;
  region: string | null;
};

function decode(value: string | null): string | null {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function getVisitorGeo(req: NextRequest | Request): VisitorGeo {
  const headers = 'headers' in req ? req.headers : new Headers();

  const country =
    decode(headers.get('x-vercel-ip-country')) ??
    decode(headers.get('cf-ipcountry')) ??
    null;
  const city =
    decode(headers.get('x-vercel-ip-city')) ??
    decode(headers.get('cf-ipcity')) ??
    null;
  const region =
    decode(headers.get('x-vercel-ip-country-region')) ??
    decode(headers.get('cf-region-code')) ??
    null;

  return { country, city, region };
}

/** ISO country code → flag emoji. Graceful fallback to globe. */
export function countryFlag(cc: string | null): string {
  if (!cc || cc.length !== 2) return '\u{1F30D}';
  const base = 0x1f1e6;
  const chars = cc
    .toUpperCase()
    .split('')
    .map((c) => base + c.charCodeAt(0) - 'A'.charCodeAt(0));
  try {
    return String.fromCodePoint(...chars);
  } catch {
    return '\u{1F30D}';
  }
}
