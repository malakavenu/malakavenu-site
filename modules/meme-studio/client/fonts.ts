'use client';

/**
 * Canvas text needs the fonts actually loaded before we draw, otherwise the
 * browser silently falls back (and Telugu turns into boxes). The @font-face
 * declarations come from `@fontsource/*` CSS imported in the host layout; here
 * we just wait for them to be ready.
 */

export const IMPACT_FONT = 'Anton';
export const TELUGU_FONT = 'Noto Sans Telugu';

let readyPromise: Promise<void> | null = null;

/** Returns true if a string contains Telugu script. */
export function hasTelugu(text: string): boolean {
  return /[\u0C00-\u0C7F]/.test(text);
}

/** Pick the right family for a piece of text + style. */
export function fontFamilyFor(text: string, impact: boolean): string {
  if (hasTelugu(text)) return `"${TELUGU_FONT}", sans-serif`;
  return impact ? `"${IMPACT_FONT}", "${TELUGU_FONT}", sans-serif` : `"${TELUGU_FONT}", sans-serif`;
}

/** Ensure the meme fonts are loaded before drawing to canvas. */
export async function ensureFontsLoaded(): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document)) return;
  if (readyPromise) return readyPromise;
  readyPromise = (async () => {
    const probes = [
      `700 48px "${IMPACT_FONT}"`,
      `700 48px "${TELUGU_FONT}"`,
      `400 48px "${TELUGU_FONT}"`,
    ];
    await Promise.all(
      probes.map((p) => document.fonts.load(p).catch(() => undefined)),
    );
    await document.fonts.ready;
  })();
  return readyPromise;
}
