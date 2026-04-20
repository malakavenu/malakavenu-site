'use client';

import { useEffect, useRef } from 'react';
import { track } from '@/lib/track';
import { readClientAttribution } from '@/lib/attribution';

type Props = {
  slug: string;
  readingMinutes: number;
};

/**
 * Reads scroll depth on the article body and fires:
 *   - `article_view`    once on mount (with attribution)
 *   - `article_depth`   at the first 25 / 50 / 75 / 100 % milestones
 *   - `article_completed` when depth ≥ 90% AND time-on-page ≥ 40% of
 *                         estimated reading time (heuristic for "actually read")
 *
 * Throttled with requestAnimationFrame. Mounts a `<span hidden />` as an
 * anchor for the observer (no visual footprint).
 */
export function ReadTracker({ slug, readingMinutes }: Props) {
  const fired = useRef({
    view: false,
    p25: false,
    p50: false,
    p75: false,
    p100: false,
    completed: false,
  });
  const startedAt = useRef<number>(0);

  useEffect(() => {
    if (fired.current.view) return;
    startedAt.current = Date.now();
    const attr = readClientAttribution();
    track('article_view', {
      slug,
      reading_minutes: readingMinutes,
      attr_source: attr?.source ?? null,
      attr_utm_source: attr?.utm_source ?? null,
      attr_referrer_host: attr?.referrer_host ?? null,
    });
    fired.current.view = true;
  }, [slug, readingMinutes]);

  useEffect(() => {
    const article =
      document.querySelector<HTMLElement>('.article-content') ??
      document.querySelector<HTMLElement>('article.article-page');
    if (!article) return;

    let rafId = 0;
    let scheduled = false;

    const measure = () => {
      scheduled = false;
      const rect = article.getBoundingClientRect();
      const viewportH = window.innerHeight || document.documentElement.clientHeight;
      const total = rect.height;
      if (total <= 0) return;

      const scrolled = Math.max(0, Math.min(total, viewportH - rect.top));
      const pct = Math.round((scrolled / total) * 100);

      const elapsedMs = Date.now() - startedAt.current;
      const minReadMs = readingMinutes * 60 * 1000 * 0.4;

      const fireMilestone = (key: 'p25' | 'p50' | 'p75' | 'p100', value: number) => {
        if (fired.current[key]) return;
        if (pct >= value) {
          track('article_depth', { slug, percent: value });
          fired.current[key] = true;
        }
      };
      fireMilestone('p25', 25);
      fireMilestone('p50', 50);
      fireMilestone('p75', 75);
      fireMilestone('p100', 100);

      if (!fired.current.completed && pct >= 90 && elapsedMs >= minReadMs) {
        track('article_completed', {
          slug,
          seconds: Math.round(elapsedMs / 1000),
          reading_minutes: readingMinutes,
        });
        fired.current.completed = true;
      }
    };

    const onScroll = () => {
      if (scheduled) return;
      scheduled = true;
      rafId = window.requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [slug, readingMinutes]);

  return null;
}
