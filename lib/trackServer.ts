/**
 * Server-side analytics wrapper — used in route handlers & server actions.
 * Provider swap = edit this file only.
 */
import { track as vercelTrack } from '@vercel/analytics/server';

export type TrackProps = Record<string, string | number | boolean | null | undefined>;

function sanitize(props?: TrackProps): Record<string, string | number | boolean> | undefined {
  if (!props) return undefined;
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined) continue;
    out[k] = v;
  }
  return out;
}

export async function trackServer(event: string, props?: TrackProps): Promise<void> {
  try {
    await vercelTrack(event, sanitize(props));
  } catch {
    // swallow — analytics must never break a request
  }
}
