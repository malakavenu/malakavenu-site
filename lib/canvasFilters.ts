/**
 * Browser-native canvas filter presets for the playground's Edit tab.
 *
 * These run entirely client-side via the Canvas2D `filter` API — no server
 * call, no API key, no cost. They power the "Free filters" mode and act as
 * a zero-cost fallback whenever the AI restyle path is unavailable.
 *
 * Filter strings use standard CSS `filter` syntax (sepia, hue-rotate, blur,
 * etc.).
 */

export type CanvasFilterPreset = {
  id: string;
  label: string;
  filter: string;
  /** Optional vignette overlay strength 0–1 applied after the base filter. */
  vignette?: number;
  /** Optional warm/cool tint as a CSS color drawn at low alpha. */
  tint?: { color: string; alpha: number };
};

export const CANVAS_FILTERS: CanvasFilterPreset[] = [
  {
    id: 'vintage',
    label: 'Vintage',
    filter: 'sepia(0.45) saturate(1.25) contrast(0.95)',
    vignette: 0.35,
    tint: { color: '#f4a261', alpha: 0.06 },
  },
  {
    id: 'noir',
    label: 'Noir',
    filter: 'grayscale(1) contrast(1.45) brightness(0.92)',
    vignette: 0.5,
  },
  {
    id: 'sepia',
    label: 'Sepia',
    filter: 'sepia(1) brightness(1.05) contrast(1.05)',
  },
  {
    id: 'pop',
    label: 'Pop art',
    filter: 'saturate(2.1) contrast(1.3) brightness(1.05)',
  },
  {
    id: 'cool',
    label: 'Cool blue',
    filter: 'hue-rotate(-12deg) saturate(0.95) contrast(1.1) brightness(1.02)',
    tint: { color: '#3aa0ff', alpha: 0.05 },
  },
  {
    id: 'warm',
    label: 'Warm gold',
    filter: 'sepia(0.25) saturate(1.4) brightness(1.05)',
    tint: { color: '#ffb04d', alpha: 0.06 },
  },
  {
    id: 'dreamy',
    label: 'Dreamy',
    filter: 'saturate(1.3) brightness(1.08) contrast(0.92) blur(0.6px)',
  },
  {
    id: 'mono-violet',
    label: 'Mono violet',
    filter: 'grayscale(1) contrast(1.2) brightness(1.0)',
    tint: { color: '#7c5cff', alpha: 0.18 },
  },
  {
    id: 'cyberglow',
    label: 'Cyber glow',
    filter: 'saturate(1.6) contrast(1.25) brightness(1.05) hue-rotate(8deg)',
    tint: { color: '#22d3ee', alpha: 0.07 },
    vignette: 0.3,
  },
  {
    id: 'pastel',
    label: 'Pastel',
    filter: 'saturate(0.7) brightness(1.1) contrast(0.92)',
  },
];

// Note: `applyCanvasFilter`/`loadImageElement` previously lived here as a v1
// API. The full edit pipeline now lives in `lib/imageOps.ts` (composeEdit +
// drawEditedToCanvas + loadImageElement) and supersedes them; this file only
// owns the filter PRESETS so they can be shared between modules.
