'use client';

import { useEffect, useState } from 'react';

type GeoPayload = {
  country: string | null;
  city: string | null;
  region: string | null;
  flag: string | null;
};

export function GeoBadge() {
  const [geo, setGeo] = useState<GeoPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/geo', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: GeoPayload | null) => {
        if (!cancelled && data && (data.city || data.country)) setGeo(data);
      })
      .catch(() => {
        // ignore — keep badge hidden
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!geo) return null;

  const label = geo.city ?? geo.country ?? '';
  if (!label) return null;

  return (
    <span className="geo-badge" aria-label={`Visiting from ${label}`}>
      {geo.flag ?? '\u{1F30D}'}
      <span>Hi from {label}</span>
    </span>
  );
}
