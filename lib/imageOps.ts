/**
 * Pure-canvas image operations for the playground's Free Filters studio.
 *
 * Everything here runs client-side — no server, no API key, no quota. The
 * exported `composeEdit` takes a source image plus a declarative `EditState`
 * and produces a JPEG/PNG blob with all transforms baked in.
 *
 * Order of operations (matters):
 *   1. Background removal (separate call — produces a new source image).
 *   2. Crop to aspect ratio (modifies the canvas dimensions).
 *   3. Rotate / flip (canvas transform).
 *   4. CSS filter string (filter preset + brightness/contrast/saturation/hue/blur).
 */

import type { CanvasFilterPreset } from './canvasFilters';

export type CropAspect = 'free' | '1:1' | '4:3' | '3:4' | '16:9' | '9:16';

export type Adjustments = {
  brightness: number; // 50–150 (%)
  contrast: number;   // 50–150 (%)
  saturation: number; // 0–200 (%)
  hue: number;        // -180 to 180 (deg)
  blur: number;       // 0–6 (px)
};

export const NEUTRAL_ADJUSTMENTS: Adjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  hue: 0,
  blur: 0,
};

export type EditState = {
  rotate: 0 | 90 | 180 | 270;
  flipH: boolean;
  flipV: boolean;
  cropAspect: CropAspect;
  filter: CanvasFilterPreset | null;
  adjust: Adjustments;
};

export const DEFAULT_EDIT_STATE: EditState = {
  rotate: 0,
  flipH: false,
  flipV: false,
  cropAspect: 'free',
  filter: null,
  adjust: NEUTRAL_ADJUSTMENTS,
};

/**
 * Compose a CSS `filter` string from the active preset + adjustment sliders.
 * Used both for the live `<img style={{ filter: ... }}>` preview and as the
 * canvas filter when baking the final blob, so what the user sees is exactly
 * what they download.
 */
export function buildFilterCss(filter: CanvasFilterPreset | null, adjust: Adjustments): string {
  const parts: string[] = [];
  if (filter?.filter) parts.push(filter.filter);
  if (adjust.brightness !== 100) parts.push(`brightness(${adjust.brightness}%)`);
  if (adjust.contrast !== 100) parts.push(`contrast(${adjust.contrast}%)`);
  if (adjust.saturation !== 100) parts.push(`saturate(${adjust.saturation}%)`);
  if (adjust.hue !== 0) parts.push(`hue-rotate(${adjust.hue}deg)`);
  if (adjust.blur > 0) parts.push(`blur(${adjust.blur}px)`);
  return parts.join(' ').trim() || 'none';
}

const ASPECT_RATIO_MAP: Record<Exclude<CropAspect, 'free'>, number> = {
  '1:1': 1,
  '4:3': 4 / 3,
  '3:4': 3 / 4,
  '16:9': 16 / 9,
  '9:16': 9 / 16,
};

/**
 * Compute centered crop rectangle for a given aspect ratio. Returns the full
 * image rect when aspect is 'free' (no crop).
 */
export function computeCropRect(
  width: number,
  height: number,
  aspect: CropAspect,
): { sx: number; sy: number; sw: number; sh: number } {
  if (aspect === 'free') return { sx: 0, sy: 0, sw: width, sh: height };
  const targetRatio = ASPECT_RATIO_MAP[aspect];
  const sourceRatio = width / height;

  if (sourceRatio > targetRatio) {
    const sw = height * targetRatio;
    const sx = (width - sw) / 2;
    return { sx, sy: 0, sw, sh: height };
  }
  const sh = width / targetRatio;
  const sy = (height - sh) / 2;
  return { sx: 0, sy, sw: width, sh };
}

/**
 * Paint the image into the supplied canvas with every `EditState` op applied.
 * Synchronous — caller owns the canvas. Used both by the live preview and by
 * `composeEdit` so the preview is pixel-identical to the downloaded result.
 */
export function drawEditedToCanvas(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  state: EditState,
): void {
  const crop = computeCropRect(image.naturalWidth, image.naturalHeight, state.cropAspect);

  const rotated = state.rotate % 180 !== 0;
  const outW = Math.max(1, Math.round(rotated ? crop.sh : crop.sw));
  const outH = Math.max(1, Math.round(rotated ? crop.sw : crop.sh));

  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable.');

  ctx.clearRect(0, 0, outW, outH);
  ctx.save();
  ctx.translate(outW / 2, outH / 2);
  ctx.rotate((state.rotate * Math.PI) / 180);
  ctx.scale(state.flipH ? -1 : 1, state.flipV ? -1 : 1);
  ctx.filter = buildFilterCss(state.filter, state.adjust);

  ctx.drawImage(
    image,
    crop.sx,
    crop.sy,
    crop.sw,
    crop.sh,
    -crop.sw / 2,
    -crop.sh / 2,
    crop.sw,
    crop.sh,
  );

  ctx.restore();
  ctx.filter = 'none';

  if (state.filter?.tint) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = state.filter.tint.color;
    ctx.globalAlpha = state.filter.tint.alpha;
    ctx.fillRect(0, 0, outW, outH);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  if (state.filter?.vignette && state.filter.vignette > 0) {
    const r = Math.hypot(outW, outH) / 2;
    const grad = ctx.createRadialGradient(outW / 2, outH / 2, r * 0.55, outW / 2, outH / 2, r);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, `rgba(0,0,0,${Math.min(0.85, state.filter.vignette)})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, outW, outH);
  }
}

/**
 * Render the supplied image with all `EditState` operations applied and
 * return a JPEG/PNG blob ready to download.
 */
export async function composeEdit(
  image: HTMLImageElement,
  state: EditState,
  opts: { type?: 'image/jpeg' | 'image/png'; quality?: number } = {},
): Promise<Blob> {
  const { type = 'image/jpeg', quality = 0.92 } = opts;
  const canvas = document.createElement('canvas');
  drawEditedToCanvas(canvas, image, state);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not export edited image.'))),
      type,
      quality,
    );
  });
}

/**
 * Lazy-load `@imgly/background-removal` only when the user invokes the action,
 * so the ~MB ONNX model isn't part of the initial bundle.
 */
export async function removeBackground(imageUrl: string): Promise<Blob> {
  const { removeBackground: imglyRemoveBackground } = await import('@imgly/background-removal');
  return imglyRemoveBackground(imageUrl);
}

/** Force `<img>` element to load a Blob URL and resolve once decoded. */
export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image.'));
    img.src = src;
  });
}
