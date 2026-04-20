/**
 * First-touch attribution.
 *
 * On the visitor's first page view we capture:
 *   - document.referrer (hostname only, never the full URL)
 *   - utm_source / utm_medium / utm_campaign / utm_term / utm_content
 *   - landing pathname
 *   - short-link source (?src= from /r/[source])
 *   - timestamp
 *
 * Stored as a single base64-encoded JSON value in the `mv_attr` cookie
 * (30-day expiry, SameSite=Lax, first-party only, no PII).
 *
 * Respects navigator.doNotTrack.
 */
import type { TrackProps } from './track';

export const ATTR_COOKIE = 'mv_attr';
export const ATTR_MAX_AGE_DAYS = 30;

const UTM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
] as const;

export type Attribution = {
  referrer_host: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  landing_path: string | null;
  source: string | null;
  first_seen: string;
};

export function createEmptyAttribution(): Attribution {
  return {
    referrer_host: null,
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    utm_term: null,
    utm_content: null,
    landing_path: null,
    source: null,
    first_seen: new Date().toISOString(),
  };
}

export function encodeAttribution(a: Attribution): string {
  const json = JSON.stringify(a);
  if (typeof btoa === 'function') return btoa(unescape(encodeURIComponent(json)));
  return Buffer.from(json, 'utf8').toString('base64');
}

export function decodeAttribution(raw: string | undefined | null): Attribution | null {
  if (!raw) return null;
  try {
    const json =
      typeof atob === 'function'
        ? decodeURIComponent(escape(atob(raw)))
        : Buffer.from(raw, 'base64').toString('utf8');
    const parsed = JSON.parse(json) as Partial<Attribution>;
    return {
      ...createEmptyAttribution(),
      ...parsed,
      first_seen: parsed.first_seen ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function safeHost(input: string): string | null {
  try {
    if (!input) return null;
    return new URL(input).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Client-side: compute the attribution payload from current window state.
 */
export function buildClientAttribution(): Attribution {
  const url = new URL(window.location.href);
  const params = url.searchParams;
  const attr = createEmptyAttribution();

  attr.referrer_host = safeHost(document.referrer);
  attr.landing_path = url.pathname;
  attr.source = params.get('src') ?? null;
  for (const k of UTM_KEYS) {
    attr[k] = params.get(k);
  }

  return attr;
}

/**
 * Client-side: write the attribution cookie if none exists. No-op otherwise.
 */
export function captureAttribution(): Attribution | null {
  if (typeof window === 'undefined') return null;
  try {
    if (navigator.doNotTrack === '1') return null;
    if (document.cookie.includes(`${ATTR_COOKIE}=`)) return null;

    const attr = buildClientAttribution();

    // Skip if we have literally no signal (direct visit with no referrer and no UTM).
    const hasSignal =
      !!attr.referrer_host ||
      !!attr.source ||
      UTM_KEYS.some((k) => attr[k]);
    if (!hasSignal) return null;

    const value = encodeAttribution(attr);
    const maxAge = ATTR_MAX_AGE_DAYS * 24 * 60 * 60;
    document.cookie = `${ATTR_COOKIE}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax${
      window.location.protocol === 'https:' ? '; Secure' : ''
    }`;
    return attr;
  } catch {
    return null;
  }
}

/**
 * Client-side: read the cookie and return a decoded attribution.
 */
export function readClientAttribution(): Attribution | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${ATTR_COOKIE}=([^;]+)`),
  );
  return match ? decodeAttribution(decodeURIComponent(match[1])) : null;
}

/**
 * Flatten attribution for analytics event properties.
 */
export function attrToProps(a: Attribution | null, prefix = 'attr_'): TrackProps {
  if (!a) return {};
  const props: TrackProps = {};
  for (const [k, v] of Object.entries(a)) {
    if (v !== null && v !== undefined) {
      props[`${prefix}${k}`] = typeof v === 'string' ? v.slice(0, 120) : v;
    }
  }
  return props;
}
