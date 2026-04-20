'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { captureAttribution, readClientAttribution } from '@/lib/attribution';
import { track } from '@/lib/track';

/**
 * Mounts once in the site layout.
 *
 * On first visit with any signal (referrer, UTM, or ?src=) writes the
 * `mv_attr` cookie. On every route change fires a lightweight `page_view`
 * event. Respects Do-Not-Track.
 */
export function AttributionBoot() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    captureAttribution();
    const attr = readClientAttribution();
    track('page_view', {
      path: pathname ?? '',
      attr_source: attr?.source ?? null,
      attr_utm_source: attr?.utm_source ?? null,
      attr_referrer_host: attr?.referrer_host ?? null,
    });
  }, [pathname, searchParams]);

  return null;
}
