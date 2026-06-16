/**
 * YSRCP brand kit — inline SVG strings rendered onto the meme card canvas.
 *
 * These ship with the module so memes look brand-accurate the moment a user
 * generates them, no asset upload required. SVGs are minimal vector
 * approximations of the party's public marks — they are not the official
 * artwork files and should be regarded as fan-art reproductions.
 */

/* eslint-disable max-len */

/** Stylized YSRCP ceiling-fan symbol, white-on-blue rondel for use as watermark/logo. */
export const SVG_YSRCP_FAN = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <defs>
    <radialGradient id="ysrcpFanG" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#3b82f6" />
      <stop offset="100%" stop-color="#1e3a8a" />
    </radialGradient>
  </defs>
  <circle cx="100" cy="100" r="96" fill="url(#ysrcpFanG)" stroke="#fff" stroke-width="4" />
  <g fill="#ffffff">
    <ellipse cx="100" cy="46" rx="22" ry="42" />
    <ellipse cx="100" cy="154" rx="22" ry="42" />
    <ellipse cx="46" cy="100" rx="42" ry="22" />
    <ellipse cx="154" cy="100" rx="42" ry="22" />
    <circle cx="100" cy="100" r="20" />
  </g>
  <circle cx="100" cy="100" r="9" fill="#1e3a8a" />
</svg>`;

/** A pure white fan glyph (no background) for use over coloured surfaces. */
export const SVG_FAN_GLYPH = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <g fill="currentColor">
    <ellipse cx="50" cy="22" rx="11" ry="22" />
    <ellipse cx="50" cy="78" rx="11" ry="22" />
    <ellipse cx="22" cy="50" rx="22" ry="11" />
    <ellipse cx="78" cy="50" rx="22" ry="11" />
    <circle cx="50" cy="50" r="11" />
  </g>
</svg>`;

/** TDP bicycle (opposition target chip). */
export const SVG_TDP_CYCLE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <g fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="25" cy="68" r="18" />
    <circle cx="75" cy="68" r="18" />
    <path d="M25 68 L46 30 L70 30" />
    <path d="M46 30 L75 68" />
    <path d="M55 68 L75 68" />
    <path d="M66 30 L72 22" />
  </g>
</svg>`;

/** Janasena tumbler / glass. */
export const SVG_JANASENA_GLASS = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <g fill="currentColor">
    <path d="M28 20 H72 L66 84 H34 Z" />
    <rect x="34" y="14" width="32" height="10" rx="3" />
  </g>
</svg>`;

/** BJP lotus simplified. */
export const SVG_BJP_LOTUS = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <g fill="currentColor">
    <path d="M50 78 C28 72 18 50 22 30 C34 38 42 48 50 60 C58 48 66 38 78 30 C82 50 72 72 50 78 Z" />
    <path d="M30 80 H70 L60 90 H40 Z" />
  </g>
</svg>`;

/** Andhra Pradesh outline silhouette (approximate, simplified). */
export const SVG_AP_OUTLINE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 220">
  <path fill="currentColor" d="M70 10 L120 5 L145 25 L165 50 L180 95 L175 130 L165 160 L140 195 L110 215 L85 210 L65 185 L55 155 L40 130 L30 100 L25 75 L40 45 L55 25 Z" />
</svg>`;

/** A bold horizontal "ribbon" bar used at the top of attack/breaking cards. */
export const SVG_RIBBON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 80" preserveAspectRatio="none">
  <polygon fill="currentColor" points="0,0 1080,0 1060,40 1080,80 0,80 20,40" />
</svg>`;

/** "BREAKING" red badge with sharp corners (news-card mode). */
export const SVG_BREAKING_BADGE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 64">
  <rect x="0" y="0" width="320" height="64" fill="#dc2626" />
  <rect x="4" y="4" width="312" height="56" fill="none" stroke="#fff" stroke-width="2" />
</svg>`;

/** Helper — return an `image/svg+xml` data URL for any of these. */
export function svgDataUrl(svg: string, color?: string): string {
  let s = svg;
  if (color) s = s.replace(/currentColor/g, color);
  return `data:image/svg+xml;utf8,${encodeURIComponent(s)}`;
}
