'use client';

import { useEffect, useRef } from 'react';
import { SITE } from '@/lib/site';

export function Giscus() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (!SITE.giscus.repo || !SITE.giscus.repoId || !SITE.giscus.categoryId) return;
    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.setAttribute('data-repo', SITE.giscus.repo);
    script.setAttribute('data-repo-id', SITE.giscus.repoId);
    script.setAttribute('data-category', SITE.giscus.category);
    script.setAttribute('data-category-id', SITE.giscus.categoryId);
    script.setAttribute('data-mapping', 'pathname');
    script.setAttribute('data-strict', '0');
    script.setAttribute('data-reactions-enabled', '1');
    script.setAttribute('data-emit-metadata', '0');
    script.setAttribute('data-input-position', 'top');
    script.setAttribute('data-theme', 'dark_dimmed');
    script.setAttribute('data-lang', 'en');
    ref.current.innerHTML = '';
    ref.current.appendChild(script);
  }, []);

  if (!SITE.giscus.repo) {
    return (
      <p style={{ color: 'var(--text-muted)' }}>
        Comments aren&apos;t configured yet — for now, please reach out via{' '}
        <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
      </p>
    );
  }

  return <div ref={ref} className="giscus" />;
}
