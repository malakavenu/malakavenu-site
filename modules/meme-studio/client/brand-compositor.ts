'use client';

import type { Language, LeaderFace, MemeAsset, MemeConcept, MemeFormatId, MemeMode } from '../types';
import { MEME_FORMATS } from '../data/templates';
import { facePhotoUrl } from '../data/faces';
import { assetUrl } from '../data/assets';
import {
  SVG_AP_OUTLINE,
  SVG_BJP_LOTUS,
  SVG_BREAKING_BADGE,
  SVG_FAN_GLYPH,
  SVG_JANASENA_GLASS,
  SVG_RIBBON,
  SVG_TDP_CYCLE,
  SVG_YSRCP_FAN,
  svgDataUrl,
} from '../data/brand-svgs';
import { ensureFontsLoaded, fontFamilyFor, hasTelugu } from './fonts';

const BASE_W = 1080;

/* ─────────────────────────────────────────────────────────────────────────
 * Palette per mode — mirrors the @YSRCParty visual language.
 * ──────────────────────────────────────────────────────────────────────── */

interface Palette {
  /** Two gradient stops for the card background. */
  bgFrom: string;
  bgTo: string;
  /** Accent for ribbons / pills / kicker chips. */
  accent: string;
  /** Onion-skin tint colour used over photos. */
  tint: string;
  /** Headline colour. */
  headline: string;
  /** Subheadline / body colour. */
  body: string;
  /** Hashtag pill fill + text colour. */
  pillBg: string;
  pillFg: string;
}

const PALETTES: Record<MemeMode, Palette> = {
  hype: {
    bgFrom: '#0b3aa3',
    bgTo: '#1d68ff',
    accent: '#facc15',
    tint: 'rgba(11, 58, 163, 0.35)',
    headline: '#ffffff',
    body: 'rgba(255,255,255,0.88)',
    pillBg: 'rgba(255, 255, 255, 0.15)',
    pillFg: '#ffffff',
  },
  attack: {
    bgFrom: '#0b0b0e',
    bgTo: '#2e0606',
    accent: '#dc2626',
    tint: 'rgba(220, 38, 38, 0.45)',
    headline: '#ffffff',
    body: '#fbbf24',
    pillBg: 'rgba(220, 38, 38, 0.18)',
    pillFg: '#fecaca',
  },
  breaking: {
    bgFrom: '#0f172a',
    bgTo: '#1e3a8a',
    accent: '#dc2626',
    tint: 'rgba(15, 23, 42, 0.4)',
    headline: '#ffffff',
    body: 'rgba(255,255,255,0.84)',
    pillBg: 'rgba(255,255,255,0.12)',
    pillFg: '#ffffff',
  },
  quote: {
    bgFrom: '#0b1d3a',
    bgTo: '#0f3d8c',
    accent: '#facc15',
    tint: 'rgba(11, 29, 58, 0.5)',
    headline: '#ffffff',
    body: 'rgba(255,255,255,0.82)',
    pillBg: 'rgba(255,255,255,0.12)',
    pillFg: '#ffffff',
  },
  celebrate: {
    bgFrom: '#0b3aa3',
    bgTo: '#fbbf24',
    accent: '#ffffff',
    tint: 'rgba(11, 58, 163, 0.25)',
    headline: '#ffffff',
    body: 'rgba(255,255,255,0.92)',
    pillBg: 'rgba(255, 255, 255, 0.22)',
    pillFg: '#0b1d3a',
  },
};

/* ─────────────────────────────────────────────────────────────────────────
 * Image loading + canvas helpers
 * ──────────────────────────────────────────────────────────────────────── */

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

function gradient(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  from: string,
  to: string,
): CanvasGradient {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, from);
  g.addColorStop(1, to);
  return g;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  family: string,
  weight: string,
  boxW: number,
  boxH: number,
  maxFont: number,
  minFont = 24,
): { fontSize: number; lines: string[] } {
  let fontSize = Math.floor(maxFont);
  while (fontSize > minFont) {
    ctx.font = `${weight} ${fontSize}px ${family}`;
    const lines = wrapLines(ctx, text, boxW);
    const lineH = fontSize * 1.18;
    if (lines.length * lineH <= boxH) return { fontSize, lines };
    fontSize -= 2;
  }
  ctx.font = `${weight} ${fontSize}px ${family}`;
  return { fontSize, lines: wrapLines(ctx, text, boxW) };
}

/* ─────────────────────────────────────────────────────────────────────────
 * Brand chrome elements (drawn deterministically — no LLM involved).
 * ──────────────────────────────────────────────────────────────────────── */

/** Subtle decorative pattern: faint AP map silhouette + diagonal noise lines. */
async function drawBackdrop(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  palette: Palette,
): Promise<void> {
  ctx.fillStyle = gradient(ctx, W, H, palette.bgFrom, palette.bgTo);
  ctx.fillRect(0, 0, W, H);

  // Faint AP silhouette bottom-left
  try {
    const ap = await loadImage(svgDataUrl(SVG_AP_OUTLINE, 'rgba(255,255,255,0.07)'));
    const apH = H * 0.7;
    const apW = (apH * 200) / 220;
    ctx.drawImage(ap, -apW * 0.25, H * 0.25, apW, apH);
  } catch {
    // ignore
  }

  // Diagonal accent stripes
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = '#ffffff';
  for (let i = -H; i < W; i += 60) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + H, H);
    ctx.lineTo(i + H + 14, H);
    ctx.lineTo(i + 14, 0);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** Top-right "fan" watermark — large faded brand mark. */
async function drawFanWatermark(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  intensity = 0.13,
): Promise<void> {
  try {
    const img = await loadImage(svgDataUrl(SVG_FAN_GLYPH, `rgba(255,255,255,${intensity})`));
    const size = Math.min(W, H) * 0.7;
    ctx.drawImage(img, W * 0.55, -size * 0.2, size, size);
  } catch {
    // ignore
  }
}

/** Hashtag pill row at the bottom of the card. */
async function drawHashtagPills(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  hashtags: string[],
  palette: Palette,
): Promise<void> {
  if (!hashtags.length) return;
  const padX = W * 0.05;
  // Pills start at 15% from the bottom — gives enough room for 2 rows + the handle plate
  const rowY = H - W * 0.15;
  const pillH = W * 0.045;
  const fontSize = Math.round(pillH * 0.52);
  ctx.font = `700 ${fontSize}px ${fontFamilyFor('A', false)}`;
  ctx.textBaseline = 'middle';
  let x = padX;
  let y = rowY;
  for (const tag of hashtags.slice(0, 5)) {
    const text = tag.startsWith('#') ? tag : `#${tag}`;
    const metrics = ctx.measureText(text);
    const pillW = metrics.width + pillH * 1.2;
    if (x + pillW > W - padX) {
      x = padX;
      y += pillH + 8;
    }
    ctx.fillStyle = palette.pillBg;
    roundRect(ctx, x, y - pillH / 2, pillW, pillH, pillH / 2);
    ctx.fill();
    ctx.fillStyle = palette.pillFg;
    ctx.textAlign = 'left';
    ctx.fillText(text, x + pillH * 0.5, y + 1);
    x += pillW + 10;
  }
}

/** "@YSRCParty" handle plate, bottom-right — uses the official party symbol GIF. */
async function drawHandle(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  handle: string,
  palette: Palette,
  basePath: string,
): Promise<void> {
  const fontSize = Math.round(W * 0.022);
  ctx.font = `700 ${fontSize}px ${fontFamilyFor('A', false)}`;
  const text = handle || '@YSRCParty';
  const tw = ctx.measureText(text).width;
  const plateW = tw + fontSize * 2 + W * 0.06;
  const plateH = fontSize * 2;
  const x = W - plateW - W * 0.04;
  const y = H - plateH - W * 0.045;

  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  roundRect(ctx, x, y, plateW, plateH, plateH / 2);
  ctx.fill();

  // Official YSRCP symbol — real GIF file, fallback to SVG approximation
  const symbolUrl = `${basePath}/assets/symbols/ysrcp_symbol.gif`;
  const ls = plateH * 0.82;
  const logoX = x + plateH * 0.1;
  const logoY = y + (plateH - ls) / 2;
  try {
    const symbolImg = await loadImage(symbolUrl);
    ctx.save();
    // Clip to a circle so the symbol sits cleanly in the pill
    ctx.beginPath();
    ctx.arc(logoX + ls / 2, logoY + ls / 2, ls / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(symbolImg, logoX, logoY, ls, ls);
    ctx.restore();
  } catch {
    // Fallback: SVG approximation
    try {
      const fanImg = await loadImage(svgDataUrl(SVG_YSRCP_FAN));
      ctx.drawImage(fanImg, logoX, logoY, ls, ls);
    } catch {
      // ignore
    }
  }

  ctx.fillStyle = palette.headline;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + plateH * 1.1, y + plateH / 2);
}

/** Top "kicker" pill / ribbon (e.g. "ANOTHER BROKEN PROMISE", "BREAKING"). */
async function drawKicker(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  text: string,
  palette: Palette,
  mode: MemeMode,
): Promise<void> {
  if (!text) return;
  const upper = hasTelugu(text) ? text : text.toUpperCase();
  const fontSize = Math.round(W * 0.028);
  ctx.font = `800 ${fontSize}px ${fontFamilyFor(upper, false)}`;
  const tw = ctx.measureText(upper).width;
  const padX = fontSize * 1.2;
  const padY = fontSize * 0.55;
  const plateW = tw + padX * 2;
  const plateH = fontSize + padY * 2;
  const x = (W - plateW) / 2;
  const y = W * 0.06;

  if (mode === 'breaking') {
    try {
      const badge = await loadImage(svgDataUrl(SVG_BREAKING_BADGE));
      ctx.drawImage(badge, x, y, plateW, plateH);
    } catch {
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(x, y, plateW, plateH);
    }
  } else {
    ctx.fillStyle = palette.accent;
    roundRect(ctx, x, y, plateW, plateH, plateH / 2);
    ctx.fill();
  }

  ctx.fillStyle = mode === 'breaking' || mode === 'attack' ? '#ffffff' : '#0b1d3a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(upper, W / 2, y + plateH / 2 + 1);
}

/** Draw a leader photo with a duotone tint + soft vignette so they merge with the card. */
async function drawTintedPhoto(
  ctx: CanvasRenderingContext2D,
  src: string,
  cx: number,
  cy: number,
  w: number,
  h: number,
  tint: string,
): Promise<void> {
  try {
    const img = await loadImage(src);
    const scale = Math.max(w / img.width, h / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    const dx = cx - dw / 2;
    const dy = cy - dh / 2;

    // Clip to a rounded rect
    ctx.save();
    roundRect(ctx, cx - w / 2, cy - h / 2, w, h, Math.min(w, h) * 0.06);
    ctx.clip();
    ctx.drawImage(img, dx, dy, dw, dh);
    // Soft tint overlay for consistency with palette
    ctx.fillStyle = tint;
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
    ctx.restore();
  } catch {
    // ignore — photo absent
  }
}

/** Bold headline text with auto-fit + shadow. */
function drawHeadline(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  text: string,
  slot: { x: number; y: number; w: number; h: number; align: 'left' | 'center' | 'right' },
  color: string,
  maxFontMul = 0.11,
): void {
  if (!text) return;
  const boxW = slot.w * W;
  const boxH = slot.h * H;
  const family = fontFamilyFor(text, false);
  const { fontSize, lines } = fitText(
    ctx,
    text,
    family,
    '800',
    boxW,
    boxH,
    H * maxFontMul,
    Math.round(H * 0.03),
  );
  ctx.font = `800 ${fontSize}px ${family}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = slot.align;

  const lineH = fontSize * 1.14;
  const totalH = lines.length * lineH;
  const cx = slot.x * W;
  const startY = slot.y * H - totalH / 2 + lineH / 2;
  const anchorX = slot.align === 'left' ? cx - boxW / 2 : slot.align === 'right' ? cx + boxW / 2 : cx;

  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = fontSize * 0.18;
  ctx.shadowOffsetY = fontSize * 0.04;
  ctx.fillStyle = color;
  lines.forEach((line, i) => ctx.fillText(line, anchorX, startY + i * lineH));
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}

function drawBody(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  text: string,
  slot: { x: number; y: number; w: number; h: number; align: 'left' | 'center' | 'right' },
  color: string,
): void {
  if (!text) return;
  const boxW = slot.w * W;
  const boxH = slot.h * H;
  const family = fontFamilyFor(text, false);
  const { fontSize, lines } = fitText(
    ctx,
    text,
    family,
    '600',
    boxW,
    boxH,
    H * 0.045,
    Math.round(H * 0.022),
  );
  ctx.font = `600 ${fontSize}px ${family}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = slot.align;

  const lineH = fontSize * 1.32;
  const totalH = lines.length * lineH;
  const cx = slot.x * W;
  const startY = slot.y * H - totalH / 2 + lineH / 2;
  const anchorX = slot.align === 'left' ? cx - boxW / 2 : slot.align === 'right' ? cx + boxW / 2 : cx;

  ctx.fillStyle = color;
  lines.forEach((line, i) => ctx.fillText(line, anchorX, startY + i * lineH));
}

/** Big stylized quote marks framing a quote text. */
function drawQuoteMarks(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  x: number,
  y: number,
  size: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.font = `900 ${size}px Georgia, "Times New Roman", serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('\u201C', x, y);
}

/* ─────────────────────────────────────────────────────────────────────────
 * Per-format render recipes
 * ──────────────────────────────────────────────────────────────────────── */

interface RenderCtx {
  ctx: CanvasRenderingContext2D;
  W: number;
  H: number;
  palette: Palette;
  concept: MemeConcept;
  language: Language | 'both';
  faces: LeaderFace[];
  assets: MemeAsset[];
  basePath: string;
}

function pick(language: Language | 'both', en: string, te: string): string {
  if (language === 'en') return en || te;
  return te || en;
}

function resolveFaceSrc(rc: RenderCtx, leaderId: string, expression?: string): string | undefined {
  const leader = rc.faces.find((f) => f.leaderId === leaderId);
  if (!leader) return undefined;
  const photo = leader.photos.find((p) => p.expression === expression) ?? leader.photos[0];
  if (!photo) return undefined;
  return facePhotoUrl(rc.basePath, leader.leaderId, photo.file);
}

/** A solid colour photo placeholder when no real photo is available. */
function drawPhotoPlaceholder(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number,
  label: string,
  palette: Palette,
): void {
  ctx.save();
  roundRect(ctx, cx - w / 2, cy - h / 2, w, h, Math.min(w, h) * 0.06);
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
  // Soft inner glow
  const g = ctx.createRadialGradient(cx, cy, w * 0.1, cx, cy, w * 0.6);
  g.addColorStop(0, 'rgba(255,255,255,0.05)');
  g.addColorStop(1, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = g;
  ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
  ctx.fillStyle = palette.headline;
  ctx.font = `700 ${Math.round(h * 0.06)}px ${fontFamilyFor(label, false)}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, cx, cy);
  ctx.restore();
}

async function renderHeadlineCard(rc: RenderCtx): Promise<void> {
  const { ctx, W, H, palette, concept, language } = rc;
  await drawBackdrop(ctx, W, H, palette);
  await drawFanWatermark(ctx, W, H, 0.17);

  // Subtle gradient overlay for legibility
  const overlay = ctx.createLinearGradient(0, 0, 0, H);
  overlay.addColorStop(0, 'rgba(0,0,0,0)');
  overlay.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, W, H);

  const headline = pick(language, concept.headlineEn, concept.headlineTe);
  const sub = pick(language, concept.subheadlineEn ?? '', concept.subheadlineTe ?? '');

  drawHeadline(ctx, W, H, headline, { x: 0.5, y: 0.42, w: 0.86, h: 0.34, align: 'center' }, palette.headline, 0.13);
  drawBody(ctx, W, H, sub, { x: 0.5, y: 0.66, w: 0.86, h: 0.1, align: 'center' }, palette.body);

  await drawHashtagPills(ctx, W, H, concept.hashtags, palette);
  await drawHandle(ctx, W, H, concept.handle, palette, rc.basePath);
}

async function renderAttackCard(rc: RenderCtx): Promise<void> {
  const { ctx, W, H, palette, concept, language } = rc;
  await drawBackdrop(ctx, W, H, palette);

  // Photo slot on the right (or placeholder)
  const targetFace = concept.faces[0];
  const src = targetFace ? resolveFaceSrc(rc, targetFace.leaderId, targetFace.expression) : undefined;
  const slotX = W * 0.78;
  const slotY = H * 0.5;
  const slotW = W * 0.36;
  const slotH = H * 0.6;
  if (src) {
    await drawTintedPhoto(ctx, src, slotX, slotY, slotW, slotH, palette.tint);
  } else {
    const targetLabel = targetFace?.leaderId
      ? targetFace.leaderId.replace(/^\w/, (c) => c.toUpperCase())
      : 'Target';
    drawPhotoPlaceholder(ctx, slotX, slotY, slotW, slotH, targetLabel, palette);
  }

  // Vertical red bar separating photo from text
  ctx.fillStyle = palette.accent;
  ctx.fillRect(W * 0.6, H * 0.12, W * 0.012, H * 0.76);

  // Kicker ribbon
  const kicker =
    pick(language, concept.subheadlineEn ?? '', concept.subheadlineTe ?? '') ||
    (language === 'en' ? 'KUTAMI ALERT' : 'కూటమి అలర్ట్');
  await drawKicker(ctx, W, H, kicker, palette, 'attack');

  // Headline (Telugu primary for attacks)
  const headline = pick(language, concept.headlineEn, concept.headlineTe);
  drawHeadline(ctx, W, H, headline, { x: 0.32, y: 0.48, w: 0.5, h: 0.34, align: 'left' }, palette.headline, 0.1);

  // Subline = quote / context — taller slot so long Telugu lines don't clip
  const sub = pick(language, concept.quoteEn ?? '', concept.quoteTe ?? '');
  drawBody(ctx, W, H, sub, { x: 0.32, y: 0.72, w: 0.5, h: 0.14, align: 'left' }, palette.body);

  await drawHashtagPills(ctx, W, H, concept.hashtags, palette);
  await drawHandle(ctx, W, H, concept.handle, palette, rc.basePath);
}

async function renderQuoteCard(rc: RenderCtx): Promise<void> {
  const { ctx, W, H, palette, concept, language } = rc;
  await drawBackdrop(ctx, W, H, palette);
  await drawFanWatermark(ctx, W, H, 0.1);

  // Speaker photo on the left
  const speaker = concept.faces[0];
  const src = speaker ? resolveFaceSrc(rc, speaker.leaderId, speaker.expression) : undefined;
  const slotX = W * 0.22;
  const slotY = H * 0.5;
  const slotW = W * 0.34;
  const slotH = H * 0.6;
  if (src) {
    await drawTintedPhoto(ctx, src, slotX, slotY, slotW, slotH, palette.tint);
  } else {
    drawPhotoPlaceholder(ctx, slotX, slotY, slotW, slotH, concept.quoteAttribution || 'Speaker', palette);
  }

  // Quote marks
  drawQuoteMarks(ctx, W, H, W * 0.42, H * 0.18, H * 0.22, palette.accent);

  // Quote text
  const quoteText = pick(language, concept.quoteEn ?? concept.headlineEn, concept.quoteTe ?? concept.headlineTe);
  drawHeadline(ctx, W, H, quoteText, { x: 0.6, y: 0.5, w: 0.7, h: 0.42, align: 'left' }, palette.headline, 0.085);

  // Attribution
  const attrib = concept.quoteAttribution || '— YS Jagan';
  drawBody(ctx, W, H, attrib, { x: 0.6, y: 0.82, w: 0.7, h: 0.06, align: 'left' }, palette.body);

  await drawHashtagPills(ctx, W, H, concept.hashtags, palette);
  await drawHandle(ctx, W, H, concept.handle, palette, rc.basePath);
}

async function renderNewsCard(rc: RenderCtx): Promise<void> {
  const { ctx, W, H, palette, concept, language } = rc;
  await drawBackdrop(ctx, W, H, palette);
  await drawFanWatermark(ctx, W, H, 0.09);

  const kicker =
    pick(language, concept.subheadlineEn ?? '', concept.subheadlineTe ?? '') ||
    (language === 'en' ? 'BREAKING' : 'బ్రేకింగ్');
  await drawKicker(ctx, W, H, kicker, palette, 'breaking');

  const headline = pick(language, concept.headlineEn, concept.headlineTe);
  // Height capped at 0.42 so text never reaches the hashtag zone at 87%
  drawHeadline(ctx, W, H, headline, { x: 0.5, y: 0.5, w: 0.86, h: 0.42, align: 'center' }, palette.headline, 0.11);

  await drawHashtagPills(ctx, W, H, concept.hashtags, palette);
  await drawHandle(ctx, W, H, concept.handle, palette, rc.basePath);
}

async function renderCelebrationCard(rc: RenderCtx): Promise<void> {
  const { ctx, W, H, palette, concept, language } = rc;
  await drawBackdrop(ctx, W, H, palette);

  // Hero photo centered (or placeholder)
  const hero = concept.faces[0];
  const src = hero ? resolveFaceSrc(rc, hero.leaderId, hero.expression) : undefined;
  const slotX = W * 0.5;
  const slotY = H * 0.42;
  const slotW = W * 0.6;
  const slotH = H * 0.68;
  if (src) {
    await drawTintedPhoto(ctx, src, slotX, slotY, slotW, slotH, 'rgba(0,0,0,0.0)');
  } else {
    drawPhotoPlaceholder(ctx, slotX, slotY, slotW, slotH, 'YS Jagan', palette);
  }

  // Gold ribbon strip — moved up to leave room for text + pills
  ctx.fillStyle = palette.accent;
  ctx.fillRect(0, H * 0.72, W, H * 0.005);

  // Headline inside the lower band — kept above the 87% hashtag boundary
  const headline = pick(language, concept.headlineEn, concept.headlineTe);
  drawHeadline(ctx, W, H, headline, { x: 0.5, y: 0.79, w: 0.86, h: 0.12, align: 'center' }, palette.headline, 0.1);

  await drawHashtagPills(ctx, W, H, concept.hashtags, palette);
  await drawHandle(ctx, W, H, concept.handle, palette, rc.basePath);
}

async function renderPromiseVsReality(rc: RenderCtx): Promise<void> {
  const { ctx, W, H, palette, concept, language } = rc;
  await drawBackdrop(ctx, W, H, palette);

  // Horizontal divider
  ctx.fillStyle = palette.accent;
  ctx.fillRect(W * 0.05, H * 0.5 - 2, W * 0.9, 4);

  // Labels
  const lblPromise = language === 'en' ? 'PROMISE' : 'వాగ్దానం';
  const lblReality = language === 'en' ? 'REALITY' : 'వాస్తవం';
  ctx.fillStyle = palette.accent;
  ctx.font = `800 ${Math.round(W * 0.028)}px ${fontFamilyFor('A', false)}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(lblPromise.toUpperCase(), W * 0.06, H * 0.14);
  ctx.fillText(lblReality.toUpperCase(), W * 0.06, H * 0.56);

  const promise = pick(language, concept.subheadlineEn ?? '', concept.subheadlineTe ?? '');
  const reality = pick(language, concept.headlineEn, concept.headlineTe);
  drawHeadline(ctx, W, H, promise, { x: 0.5, y: 0.28, w: 0.86, h: 0.18, align: 'center' }, palette.body, 0.075);
  drawHeadline(ctx, W, H, reality, { x: 0.5, y: 0.72, w: 0.86, h: 0.22, align: 'center' }, palette.headline, 0.1);

  await drawHashtagPills(ctx, W, H, concept.hashtags, palette);
  await drawHandle(ctx, W, H, concept.handle, palette, rc.basePath);
}

async function renderVsPanel(rc: RenderCtx): Promise<void> {
  const { ctx, W, H, palette, concept, language } = rc;
  // Two-color split
  ctx.fillStyle = '#0b3aa3';
  ctx.fillRect(0, 0, W / 2, H);
  ctx.fillStyle = '#7c1d1d';
  ctx.fillRect(W / 2, 0, W / 2, H);

  // VS badge
  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.arc(W / 2, H / 2, W * 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0b0b0e';
  ctx.font = `900 ${Math.round(W * 0.07)}px ${fontFamilyFor('VS', false)}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('VS', W / 2, H / 2 + 2);

  // Photo slots
  const leftFace = concept.faces[0];
  const rightFace = concept.faces[1];
  if (leftFace) {
    const src = resolveFaceSrc(rc, leftFace.leaderId, leftFace.expression);
    if (src) await drawTintedPhoto(ctx, src, W * 0.25, H * 0.45, W * 0.4, H * 0.7, 'rgba(0,0,0,0)');
    else drawPhotoPlaceholder(ctx, W * 0.25, H * 0.45, W * 0.4, H * 0.7, leftFace.leaderId, palette);
  }
  if (rightFace) {
    const src = resolveFaceSrc(rc, rightFace.leaderId, rightFace.expression);
    if (src) await drawTintedPhoto(ctx, src, W * 0.75, H * 0.45, W * 0.4, H * 0.7, 'rgba(0,0,0,0)');
    else drawPhotoPlaceholder(ctx, W * 0.75, H * 0.45, W * 0.4, H * 0.7, rightFace.leaderId, palette);
  }

  // Captions
  const leftCap = pick(language, concept.slotText?.left?.en ?? concept.headlineEn, concept.slotText?.left?.te ?? concept.headlineTe);
  const rightCap = pick(language, concept.slotText?.right?.en ?? '', concept.slotText?.right?.te ?? '');
  drawHeadline(ctx, W, H, leftCap, { x: 0.25, y: 0.88, w: 0.45, h: 0.12, align: 'center' }, '#ffffff', 0.07);
  drawHeadline(ctx, W, H, rightCap, { x: 0.75, y: 0.88, w: 0.45, h: 0.12, align: 'center' }, '#ffffff', 0.07);

  await drawHandle(ctx, W, H, concept.handle, palette, rc.basePath);
}

async function renderImageMacro(rc: RenderCtx): Promise<void> {
  const { ctx, W, H, palette, concept, language } = rc;
  await drawBackdrop(ctx, W, H, palette);
  await drawFanWatermark(ctx, W, H, 0.08);

  const top = pick(language, concept.headlineEn, concept.headlineTe);
  const bottom = pick(language, concept.subheadlineEn ?? '', concept.subheadlineTe ?? '');
  // Top text at ~12%, bottom text pulled up to ~76% so it clears the hashtag pills (≥87%)
  drawHeadline(ctx, W, H, top, { x: 0.5, y: 0.12, w: 0.9, h: 0.16, align: 'center' }, palette.headline, 0.1);
  drawHeadline(ctx, W, H, bottom, { x: 0.5, y: 0.76, w: 0.9, h: 0.16, align: 'center' }, palette.headline, 0.1);

  await drawHashtagPills(ctx, W, H, concept.hashtags, palette);
  await drawHandle(ctx, W, H, concept.handle, palette, rc.basePath);
}

async function renderStatsCard(rc: RenderCtx): Promise<void> {
  const { ctx, W, H, palette, concept, language } = rc;
  await drawBackdrop(ctx, W, H, palette);
  await drawFanWatermark(ctx, W, H, 0.12);

  // Gold radial glow behind the stat number
  const glow = ctx.createRadialGradient(W * 0.5, H * 0.35, W * 0.05, W * 0.5, H * 0.35, W * 0.45);
  glow.addColorStop(0, 'rgba(250,204,21,0.22)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Horizontal gold accent bar at top
  ctx.fillStyle = palette.accent;
  ctx.fillRect(W * 0.08, H * 0.11, W * 0.84, H * 0.006);

  // Giant gold "stat" number / text
  const stat = pick(language, concept.subheadlineEn ?? concept.headlineEn, concept.subheadlineTe ?? concept.headlineTe);
  const statFamily = fontFamilyFor(stat, false);
  const statSize = Math.min(H * 0.18, W * 0.16);
  ctx.font = `900 ${statSize}px ${statFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = palette.accent;
  ctx.shadowColor = 'rgba(250,204,21,0.5)';
  ctx.shadowBlur = statSize * 0.3;
  ctx.fillText(stat, W * 0.5, H * 0.35);
  ctx.shadowBlur = 0;

  // Main headline below the stat
  const headline = pick(language, concept.headlineEn, concept.headlineTe);
  drawHeadline(ctx, W, H, headline, { x: 0.5, y: 0.58, w: 0.86, h: 0.2, align: 'center' }, palette.headline, 0.1);

  // Sub-context line
  const sub = pick(language, concept.punchline ?? '', concept.punchline ?? '');
  if (sub) drawBody(ctx, W, H, sub, { x: 0.5, y: 0.76, w: 0.82, h: 0.09, align: 'center' }, palette.body);

  // Bottom gold bar
  ctx.fillStyle = palette.accent;
  ctx.fillRect(W * 0.08, H * 0.84, W * 0.84, H * 0.004);

  await drawHashtagPills(ctx, W, H, concept.hashtags, palette);
  await drawHandle(ctx, W, H, concept.handle, palette, rc.basePath);
}

async function renderProtestBanner(rc: RenderCtx): Promise<void> {
  const { ctx, W, H, palette, concept, language } = rc;

  // Dark dramatic base gradient (left-to-right, darker on right to house leader photo)
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0b0b0e');
  bg.addColorStop(0.55, '#1a0505');
  bg.addColorStop(1, '#0b0b0e');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Red diagonal slash — protest energy
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.moveTo(W * 0.18, 0);
  ctx.lineTo(W * 0.32, 0);
  ctx.lineTo(W * 0.14, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  ctx.moveTo(W * 0.35, 0);
  ctx.lineTo(W * 0.38, 0);
  ctx.lineTo(W * 0.2, H);
  ctx.lineTo(W * 0.17, H);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Leader face — right-edge cutout
  const leader = concept.faces[0];
  const src = leader ? resolveFaceSrc(rc, leader.leaderId, leader.expression) : undefined;
  if (src) {
    await drawTintedPhoto(ctx, src, W * 0.88, H * 0.5, W * 0.22, H * 0.9, 'rgba(11,58,163,0.2)');
  }

  // Kicker ribbon at top
  const kicker =
    pick(language, concept.subheadlineEn ?? '', concept.subheadlineTe ?? '') ||
    (language === 'en' ? 'TWO YEARS OF BACKSTABBING' : 'వెన్నుపోటుకు రెండేళ్లు');
  await drawKicker(ctx, W, H, kicker, palette, 'attack');

  // Big rally headline
  const headline = pick(language, concept.headlineEn, concept.headlineTe);
  drawHeadline(ctx, W, H, headline, { x: 0.44, y: 0.5, w: 0.74, h: 0.34, align: 'center' }, '#ffffff', 0.13);

  // Date / location subline
  const sub = pick(language, concept.punchline ?? '', concept.punchline ?? '');
  if (sub) drawBody(ctx, W, H, sub, { x: 0.44, y: 0.79, w: 0.72, h: 0.1, align: 'center' }, palette.accent);

  await drawHashtagPills(ctx, W, H, concept.hashtags, palette);
  await drawHandle(ctx, W, H, concept.handle, palette, rc.basePath);
}

async function renderHeritageCard(rc: RenderCtx): Promise<void> {
  const { ctx, W, H, palette, concept, language } = rc;

  // Left half — sepia / warm heritage zone
  const leftBg = ctx.createLinearGradient(0, 0, W / 2, H);
  leftBg.addColorStop(0, '#3b1f0a');
  leftBg.addColorStop(1, '#7c3d12');
  ctx.fillStyle = leftBg;
  ctx.fillRect(0, 0, W / 2, H);

  // Right half — YSRCP party blue
  const rightBg = ctx.createLinearGradient(W / 2, 0, W, H);
  rightBg.addColorStop(0, '#0b3aa3');
  rightBg.addColorStop(1, '#1d68ff');
  ctx.fillStyle = rightBg;
  ctx.fillRect(W / 2, 0, W / 2, H);

  // Central gold divider
  ctx.fillStyle = '#facc15';
  ctx.fillRect(W / 2 - 3, H * 0.08, 6, H * 0.78);

  // Heritage figure (left — typically YSR)
  const heritageFace = concept.faces[0];
  const hSrc = heritageFace ? resolveFaceSrc(rc, heritageFace.leaderId, heritageFace.expression) : undefined;
  if (hSrc) {
    await drawTintedPhoto(ctx, hSrc, W * 0.25, H * 0.42, W * 0.42, H * 0.62, 'rgba(120,60,10,0.35)');
  } else {
    drawPhotoPlaceholder(ctx, W * 0.25, H * 0.42, W * 0.42, H * 0.62, 'YSR', { ...palette, headline: '#f5c88b' });
  }

  // Current leader (right — typically Jagan)
  const currentFace = concept.faces[1];
  const cSrc = currentFace ? resolveFaceSrc(rc, currentFace.leaderId, currentFace.expression) : undefined;
  if (cSrc) {
    await drawTintedPhoto(ctx, cSrc, W * 0.75, H * 0.42, W * 0.42, H * 0.62, 'rgba(11,58,163,0.25)');
  } else {
    drawPhotoPlaceholder(ctx, W * 0.75, H * 0.42, W * 0.42, H * 0.62, 'Jagan', palette);
  }

  // Gold arrow symbol between the two halves
  ctx.fillStyle = '#facc15';
  ctx.font = `900 ${Math.round(H * 0.06)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('→', W / 2, H * 0.42);

  // Gold banner strip at bottom
  ctx.fillStyle = '#facc15';
  ctx.fillRect(0, H * 0.74, W, H * 0.005);

  // Semi-transparent bottom overlay for text legibility
  const textBg = ctx.createLinearGradient(0, H * 0.72, 0, H);
  textBg.addColorStop(0, 'rgba(0,0,0,0)');
  textBg.addColorStop(1, 'rgba(0,0,0,0.72)');
  ctx.fillStyle = textBg;
  ctx.fillRect(0, H * 0.72, W, H * 0.28);

  // Heritage epithet label
  const epithet = language === 'en' ? 'LEGACY' : 'వారసత్వం';
  ctx.fillStyle = '#facc15';
  ctx.font = `700 ${Math.round(W * 0.025)}px ${fontFamilyFor(epithet, false)}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(epithet.toUpperCase(), W / 2, H * 0.77);

  // Main heritage headline
  const headline = pick(language, concept.headlineEn, concept.headlineTe);
  drawHeadline(ctx, W, H, headline, { x: 0.5, y: 0.85, w: 0.88, h: 0.14, align: 'center' }, '#ffffff', 0.09);

  await drawHashtagPills(ctx, W, H, concept.hashtags, palette);
  await drawHandle(ctx, W, H, concept.handle, palette, rc.basePath);
}

/* ─────────────────────────────────────────────────────────────────────────
 * Public entry — render a MemeConcept to a PNG data URL.
 * ──────────────────────────────────────────────────────────────────────── */

export interface BrandComposeOptions {
  basePath: string;
  language: Language | 'both';
  faces: LeaderFace[];
  assets: MemeAsset[];
}

const RENDERERS: Record<MemeFormatId, (rc: RenderCtx) => Promise<void>> = {
  'headline-card': renderHeadlineCard,
  'attack-card': renderAttackCard,
  'quote-card': renderQuoteCard,
  'news-card': renderNewsCard,
  'celebration-card': renderCelebrationCard,
  'promise-vs-reality': renderPromiseVsReality,
  'vs-panel': renderVsPanel,
  'image-macro': renderImageMacro,
  'stats-card': renderStatsCard,
  'protest-banner': renderProtestBanner,
  'heritage-card': renderHeritageCard,
};

export async function renderBrandedMeme(
  concept: MemeConcept,
  opts: BrandComposeOptions,
): Promise<string> {
  await ensureFontsLoaded();
  const format = MEME_FORMATS[concept.format] ?? MEME_FORMATS['headline-card'];
  const palette = PALETTES[concept.mode] ?? PALETTES[format.defaultMode];

  const W = BASE_W;
  const H = Math.round((BASE_W * format.aspect.h) / format.aspect.w);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  const renderer = RENDERERS[format.id] ?? renderHeadlineCard;
  await renderer({
    ctx,
    W,
    H,
    palette,
    concept,
    language: opts.language,
    faces: opts.faces,
    assets: opts.assets,
    basePath: opts.basePath,
  });

  return canvas.toDataURL('image/png');
}

/** Build a small inline preview of any party symbol — useful for chips. */
export function partySymbolDataUrl(partyCode: string, color = '#ffffff'): string {
  switch (partyCode) {
    case 'ysrcp':
      return svgDataUrl(SVG_YSRCP_FAN);
    case 'tdp':
      return svgDataUrl(SVG_TDP_CYCLE, color);
    case 'janasena':
      return svgDataUrl(SVG_JANASENA_GLASS, color);
    case 'bjp':
      return svgDataUrl(SVG_BJP_LOTUS, color);
    default:
      return svgDataUrl(SVG_FAN_GLYPH, color);
  }
}

/** Re-export ribbon SVG for any caller that wants to use it directly. */
export { SVG_RIBBON };
