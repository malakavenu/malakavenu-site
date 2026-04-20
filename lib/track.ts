/**
 * Thin analytics wrapper.
 *
 * All `track()` calls in the app go through this file so swapping analytics
 * providers (Plausible, Umami, PostHog, GA4, Fathom) is a one-file change.
 *
 * Respects Do-Not-Track and the `mv_track_opt_out` cookie.
 */
'use client';

import { track as vercelTrack } from '@vercel/analytics';

export type TrackProps = Record<string, string | number | boolean | null | undefined>;

function isOptedOut(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    if (navigator.doNotTrack === '1') return true;
    const w = window as Window & { doNotTrack?: string };
    if (w.doNotTrack === '1') return true;
    if (document.cookie.includes('mv_track_opt_out=1')) return true;
  } catch {
    // ignore
  }
  return false;
}

function sanitize(props?: TrackProps): Record<string, string | number | boolean> | undefined {
  if (!props) return undefined;
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined) continue;
    out[k] = v;
  }
  return out;
}

export function track(event: string, props?: TrackProps) {
  if (isOptedOut()) return;
  try {
    vercelTrack(event, sanitize(props));
  } catch {
    // swallow — analytics must never break UX
  }
}
