'use client';

import { useEffect, useState } from 'react';

type Props = { slug: string };

type Payload = { count: number; enabled: boolean };

/**
 * Shows "N reading now" when the KV-backed live counter has visitors within
 * the last 5 minutes and the viewer is not alone (count > 1).
 *
 * Silently hidden when KV is not configured or when DNT is enabled.
 */
export function ReadingNow({ slug }: Props) {
  const [count, setCount] = useState(0);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.doNotTrack === '1') return;

    let cancelled = false;

    async function beat(method: 'POST' | 'GET') {
      try {
        const res = await fetch(`/api/live/${encodeURIComponent(slug)}`, {
          method,
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = (await res.json()) as Payload;
        if (cancelled) return;
        setEnabled(data.enabled);
        setCount(data.count);
      } catch {
        // ignore
      }
    }

    beat('POST');
    const beatId = window.setInterval(() => beat('POST'), 60 * 1000);
    const pollId = window.setInterval(() => beat('GET'), 20 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(beatId);
      window.clearInterval(pollId);
    };
  }, [slug]);

  if (!enabled || count <= 1) return null;

  return (
    <>
      <span className="article-dot">·</span>
      <span className="reading-now" aria-live="polite">
        <span className="reading-now-dot" aria-hidden="true" />
        {count} reading now
      </span>
    </>
  );
}
