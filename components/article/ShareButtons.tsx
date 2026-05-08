'use client';

import { useState } from 'react';
import { track } from '@/lib/track';
import { SITE } from '@/lib/site';

type Props = { url: string; title: string; slug?: string };

/**
 * Build the same-origin path for a given article share so we can route the
 * outbound share through `/r/<channel>?to=…`. The `/r` redirector tags every
 * incoming visitor with `utm_source=<channel>` (and emits a server-side
 * `referral_visit` event), which is how we attribute traffic from places like
 * WhatsApp / Slack DMs that strip referrer headers.
 */
function buildTrackedShareUrl(channel: string, fullUrl: string): string {
  try {
    const u = new URL(fullUrl);
    const path = `${u.pathname}${u.search}${u.hash}` || '/';
    return `${SITE.url}/r/${channel}?to=${encodeURIComponent(path)}`;
  } catch {
    return fullUrl;
  }
}

export function ShareButtons({ url, title, slug }: Props) {
  const [copied, setCopied] = useState(false);
  const xIntent = `https://x.com/intent/post?url=${encodeURIComponent(
    url,
  )}&text=${encodeURIComponent(title)}&via=malakavenu`;
  const linkedin = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
  const facebook = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  // WhatsApp: route the link through /r/whatsapp so inbound clicks are
  // attributed even though WhatsApp strips the Referer header.
  const whatsappTrackedUrl = buildTrackedShareUrl('whatsapp', url);
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${title} — ${whatsappTrackedUrl}`)}`;

  return (
    <div className="article-share">
      <a
        className="share-btn"
        target="_blank"
        rel="noopener"
        href={xIntent}
        aria-label="Share on X (formerly Twitter)"
        onClick={() => track('share_click', { channel: 'x', slug: slug ?? null })}
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        Share
      </a>
      <a
        className="share-btn"
        target="_blank"
        rel="noopener"
        href={linkedin}
        onClick={() => track('share_click', { channel: 'linkedin', slug: slug ?? null })}
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
        </svg>
        LinkedIn
      </a>
      <a
        className="share-btn"
        target="_blank"
        rel="noopener"
        href={whatsapp}
        aria-label="Share on WhatsApp"
        onClick={() => track('share_click', { channel: 'whatsapp', slug: slug ?? null })}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M.057 24l1.687-6.163A11.867 11.867 0 0 1 .005 11.94C.005 5.355 5.357 0 11.945 0a11.86 11.86 0 0 1 8.413 3.488 11.84 11.84 0 0 1 3.484 8.414c-.003 6.585-5.358 11.938-11.948 11.938a11.92 11.92 0 0 1-5.71-1.456L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.516 5.27l.241.383-1.001 3.65 3.733-.992zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.207-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479c0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
        </svg>
        WhatsApp
      </a>
      <a
        className="share-btn"
        target="_blank"
        rel="noopener"
        href={facebook}
        onClick={() => track('share_click', { channel: 'facebook', slug: slug ?? null })}
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
        Facebook
      </a>
      <button
        type="button"
        className="share-btn"
        onClick={async () => {
          track('share_click', { channel: 'copy', slug: slug ?? null });
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            // ignore
          }
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
        <span className="copy-label">{copied ? 'Copied!' : 'Copy link'}</span>
      </button>
    </div>
  );
}
