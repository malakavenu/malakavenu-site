'use client';

/**
 * AnimatedFace — purpose-built lip-syncing avatar for the 2D fallback path.
 *
 * Replaces the static DiceBear portrait. Renders a friendly, brand-tinted
 * SVG face whose **mouth element is a live SVG ellipse that we resize +
 * reshape on every animation frame** based on the analyser volume and the
 * dominant viseme. The result is real, visible lip-sync without having to
 * load a 3D model.
 *
 * Design goals:
 *   - Modern, abstract look (no uncanny-valley realism attempt).
 *   - Cohesive with the rest of the studio's violet→cyan palette.
 *   - Per-preset variation via the `seed` prop — skin tone, hair colour,
 *     accessory (glasses/headphones/cap), and eye shape all derive from a
 *     simple hash so the same preset always renders the same face.
 *   - All animation runs off two refs the parent updates via RAF: a mouth
 *     `<ellipse>` and an eyelid `<rect>` per side. No React re-renders.
 */

import { useEffect, useMemo, useRef } from 'react';
import type { VisemeName } from './useLipsync';

interface AnimatedFaceProps {
  /** Deterministic seed — same string ⇒ same face every time. */
  seed: string;
  /** Returns current normalised volume (0..1). */
  getVolume: () => number;
  /** Returns the current dominant viseme (drives mouth width / shape). */
  getViseme?: () => VisemeName;
  /** SVG render width in CSS px. Height is the same. */
  size: number;
  /**
   * Drives hair length, beard, and lip tint so a male avatar (Kai / Rohit)
   * never renders with long hair + lipstick, and a female avatar (Aria /
   * Maya) never gets a beard. Defaults to `neutral` for backward compat.
   */
  gender?: 'female' | 'male' | 'neutral';
}

// ─── Style palette helpers ────────────────────────────────────────────────

const SKIN_TONES = [
  '#fde2c8', '#f5c69c', '#e0a779', '#c98760', '#9b6643', '#6e4530',
];
const HAIR_COLOURS = [
  '#1f1d2e', '#3a2e2a', '#6f3b1f', '#a86b3c', '#d9a05b', '#c9d2dc',
  '#5b3aa5', '#22d3ee', '#ec4899',
];
const ACCESSORY = ['none', 'glasses', 'headphones', 'cap'] as const;
type Accessory = (typeof ACCESSORY)[number];

// Hair variant index → silhouette in <Hair />. Female presets pick from
// {long, top-knot} so they read as long-haired; male presets pick from
// {short, bald} so they don't grow long hair on a bearded face.
const FEMALE_HAIR_VARIANTS = [2, 3] as const;   // long, bun
const MALE_HAIR_VARIANTS   = [1, 0] as const;   // short crop, bald
const NEUTRAL_HAIR_VARIANTS = [0, 1, 2, 3] as const;

function hash(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(arr: readonly T[], seed: number): T {
  return arr[seed % arr.length];
}

interface Palette {
  skin: string;
  hair: string;
  accessory: Accessory;
  // Subtle deterministic mouth lipstick — fades into mouth interior so it
  // reads as a healthy lip colour rather than a stamped overlay.
  lip: string;
  /** Hair silhouette index — chosen from a gender-specific bucket */
  hairVariant: number;
  /** Whether to render facial hair (beard) under the chin */
  beard: boolean;
}

const FEMALE_LIPS = ['#c45a73', '#a8475c', '#7c3a51', '#b25166'];
const MALE_LIPS = ['#a06155', '#8a5044', '#7d4a40', '#6f3f37']; // muted, no makeup

function palette(seed: string, gender: 'female' | 'male' | 'neutral'): Palette {
  const h = hash(seed);
  const hairBucket =
    gender === 'female' ? FEMALE_HAIR_VARIANTS :
    gender === 'male'   ? MALE_HAIR_VARIANTS   :
                          NEUTRAL_HAIR_VARIANTS;
  return {
    skin: pick(SKIN_TONES, h >>> 1),
    hair: pick(HAIR_COLOURS, h >>> 3),
    accessory: pick(ACCESSORY, h >>> 5),
    lip: pick(gender === 'male' ? MALE_LIPS : FEMALE_LIPS, h >>> 7),
    hairVariant: pick(hairBucket, h >>> 9) as number,
    // ~60% of male presets get a beard, 0% female — deterministic per seed.
    beard: gender === 'male' && (((h >>> 11) & 0b11) !== 0),
  };
}

// ─── Viseme → mouth shape lookup ──────────────────────────────────────────
//
// Each entry is the FULL width / height of the mouth (in 100×100 viewBox
// units) at vol = 1. These intentionally stay small — the mouth on a typical
// face is ~18-20% of the face width and only opens a few px at peak volume,
// even on an open "aa". Anything larger and the mouth dominates the face.
//
// The actual rendered size is interpolated: at vol = 0 we render `restW` /
// `restH` (the closed-mouth resting shape), at vol = 1 we render the shape
// values below. Together with the dominant-viseme switcher this gives the
// classic round-O / wide-E / open-aa silhouettes without distorting the
// face proportions.
const VISEME_SHAPE: Record<VisemeName, { w: number; h: number }> = {
  viseme_sil: { w: 11, h: 1.6 },  // silence — nearly closed
  viseme_PP:  { w: 10, h: 1.4 },  // lips closed (P, B, M)
  viseme_FF:  { w: 12, h: 2.2 },  // teeth on lip (F, V)
  viseme_TH:  { w: 12, h: 3.6 },  // tongue out (TH)
  viseme_DD:  { w: 13, h: 4.2 },  // T, D, N partial open
  viseme_kk:  { w: 13, h: 4.0 },  // K, G
  viseme_CH:  { w: 10, h: 4.2 },  // CH, J — round
  viseme_SS:  { w: 12, h: 2.0 },  // S, Z
  viseme_nn:  { w: 12, h: 3.4 },  // N
  viseme_RR:  { w: 11, h: 4.4 },  // R
  viseme_aa:  { w: 14, h: 7.5 },  // open A — biggest gape
  viseme_E:   { w: 16, h: 4.0 },  // wide E
  viseme_I:   { w: 15, h: 3.0 },  // I (smile)
  viseme_O:   { w: 9,  h: 6.0 },  // round O
  viseme_U:   { w: 7,  h: 4.6 },  // tight U
};

// Resting shape — what the mouth looks like at vol = 0 regardless of viseme.
// A thin, slightly-wider-than-tall pill — neutral expression.
const REST_SHAPE = { w: 11, h: 1.6 };

// ─── Blink scheduler — independent of the parent ──────────────────────────

const BLINK_CLOSE_MS = 80;
const BLINK_OPEN_MS = 120;

interface BlinkState {
  nextBlinkAt: number;
  phase: 'idle' | 'closing' | 'opening';
  start: number;
  doubleBlink: boolean;
}

function nextBlinkState(now: number): BlinkState {
  return {
    nextBlinkAt: now + 3000 + Math.random() * 3000,
    phase: 'idle',
    start: 0,
    doubleBlink: Math.random() < 0.18,
  };
}

// ─── Component ────────────────────────────────────────────────────────────

export function AnimatedFace({ seed, getVolume, getViseme, size, gender = 'neutral' }: AnimatedFaceProps) {
  const p = useMemo(() => palette(seed, gender), [seed, gender]);
  const mouthRef = useRef<SVGEllipseElement>(null);
  const lipRef = useRef<SVGEllipseElement>(null);
  const eyelidLRef = useRef<SVGRectElement>(null);
  const eyelidRRef = useRef<SVGRectElement>(null);
  const blinkRef = useRef<BlinkState>(nextBlinkState(0));

  useEffect(() => {
    blinkRef.current = nextBlinkState(performance.now());
    let raf: number;

    const tick = () => {
      const vol = Math.min(1, Math.max(0, getVolume()));
      const viseme = getViseme?.() ?? 'viseme_sil';
      const shape = VISEME_SHAPE[viseme] ?? VISEME_SHAPE.viseme_sil;

      if (mouthRef.current && lipRef.current) {
        // Interpolate between the resting shape (vol = 0) and the viseme's
        // target shape (vol = 1). A gentle pow curve gives a more natural
        // attack so quiet syllables don't fully open the mouth.
        const t = Math.pow(vol, 0.7);
        const w = REST_SHAPE.w + (shape.w - REST_SHAPE.w) * t;
        const h = REST_SHAPE.h + (shape.h - REST_SHAPE.h) * t;
        // Hard safety clamp so a runaway analyser can never spawn a face-
        // swallowing mouth: width ≤ 18 (≈ 28% of face), height ≤ 8.5.
        const rx = Math.min(9, w / 2);
        const ry = Math.min(4.25, Math.max(0.7, h / 2));
        mouthRef.current.setAttribute('rx', rx.toFixed(2));
        mouthRef.current.setAttribute('ry', ry.toFixed(2));
        // The lip outline sits ~0.7px outside the mouth interior so it
        // reads as a soft pink lip rather than a thick painted ring.
        lipRef.current.setAttribute('rx', (rx + 0.7).toFixed(2));
        lipRef.current.setAttribute('ry', (ry + 0.7).toFixed(2));
      }

      // Blink scheduler
      const now = performance.now();
      const blink = blinkRef.current;
      if (blink.phase === 'idle' && now >= blink.nextBlinkAt) {
        blink.phase = 'closing';
        blink.start = now;
      }
      let blinkWeight = 0;
      if (blink.phase === 'closing') {
        const t = (now - blink.start) / BLINK_CLOSE_MS;
        blinkWeight = Math.min(1, t);
        if (t >= 1) {
          blink.phase = 'opening';
          blink.start = now;
        }
      } else if (blink.phase === 'opening') {
        const t = (now - blink.start) / BLINK_OPEN_MS;
        blinkWeight = Math.max(0, 1 - t);
        if (t >= 1) {
          blink.phase = 'idle';
          if (blink.doubleBlink) {
            blink.doubleBlink = false;
            blink.nextBlinkAt = now + 150;
          } else {
            blink.nextBlinkAt = now + 3000 + Math.random() * 3000;
            blink.doubleBlink = Math.random() < 0.18;
          }
        }
      }
      // Eyelid is a rect that fills the eye when blinkWeight = 1.
      if (eyelidLRef.current && eyelidRRef.current) {
        const h = (blinkWeight * 7).toFixed(2);
        eyelidLRef.current.setAttribute('height', h);
        eyelidRRef.current.setAttribute('height', h);
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [getVolume, getViseme]);

  // Position constants — all in 100×100 face coordinates.
  const MOUTH_CX = 50;
  const MOUTH_CY = 64;
  const EYE_Y = 44;
  const EYE_DX = 14;
  const EYE_RX = 6;
  const EYE_RY = 8;

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={`Voice studio avatar — ${seed}`}
    >
      <defs>
        <linearGradient id={`bg-${seed}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(124, 92, 255, 0.18)" />
          <stop offset="100%" stopColor="rgba(34, 211, 238, 0.12)" />
        </linearGradient>
        <radialGradient id={`face-${seed}`} cx="0.5" cy="0.42" r="0.62">
          <stop offset="0%" stopColor={lighten(p.skin, 0.08)} />
          <stop offset="80%" stopColor={p.skin} />
          <stop offset="100%" stopColor={darken(p.skin, 0.1)} />
        </radialGradient>
      </defs>

      {/* Soft brand-tinted backdrop circle */}
      <circle cx="50" cy="50" r="50" fill={`url(#bg-${seed})`} />

      {/* Hair / hat behind the face for silhouette — variant comes from the
          gender-aware palette so male presets never grow flowing hair. */}
      <Hair hair={p.hair} variant={p.hairVariant} />

      {/* Face */}
      <circle cx="50" cy="52" r="32" fill={`url(#face-${seed})`} />

      {/* Cheeks — faint blush */}
      <ellipse cx="30" cy="60" rx="4.5" ry="3" fill={lighten(p.lip, 0.4)} opacity="0.35" />
      <ellipse cx="70" cy="60" rx="4.5" ry="3" fill={lighten(p.lip, 0.4)} opacity="0.35" />

      {/* Eye whites */}
      <ellipse cx={50 - EYE_DX} cy={EYE_Y} rx={EYE_RX} ry={EYE_RY} fill="#ffffff" />
      <ellipse cx={50 + EYE_DX} cy={EYE_Y} rx={EYE_RX} ry={EYE_RY} fill="#ffffff" />

      {/* Pupils */}
      <circle cx={50 - EYE_DX} cy={EYE_Y + 1.5} r="2.6" fill="#1a1626" />
      <circle cx={50 + EYE_DX} cy={EYE_Y + 1.5} r="2.6" fill="#1a1626" />
      {/* Pupil highlight */}
      <circle cx={50 - EYE_DX + 1} cy={EYE_Y + 0.2} r="0.8" fill="#ffffff" />
      <circle cx={50 + EYE_DX + 1} cy={EYE_Y + 0.2} r="0.8" fill="#ffffff" />

      {/* Eyelids — start at zero height; the RAF sets height during blinks */}
      <g>
        <rect
          ref={eyelidLRef}
          x={50 - EYE_DX - EYE_RX}
          y={EYE_Y - EYE_RY}
          width={EYE_RX * 2}
          height="0"
          fill={darken(p.skin, 0.05)}
        />
        <rect
          ref={eyelidRRef}
          x={50 + EYE_DX - EYE_RX}
          y={EYE_Y - EYE_RY}
          width={EYE_RX * 2}
          height="0"
          fill={darken(p.skin, 0.05)}
        />
      </g>

      {/* Eyebrows */}
      <path
        d={`M${50 - EYE_DX - 6.5},${EYE_Y - EYE_RY - 4} Q${50 - EYE_DX},${EYE_Y - EYE_RY - 6.5} ${50 - EYE_DX + 6.5},${EYE_Y - EYE_RY - 4}`}
        stroke={darken(p.hair, 0.15)}
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d={`M${50 + EYE_DX - 6.5},${EYE_Y - EYE_RY - 4} Q${50 + EYE_DX},${EYE_Y - EYE_RY - 6.5} ${50 + EYE_DX + 6.5},${EYE_Y - EYE_RY - 4}`}
        stroke={darken(p.hair, 0.15)}
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />

      {/* Nose hint */}
      <path
        d="M50,54 Q49,57 50,60 Q51,57 50,54"
        stroke={darken(p.skin, 0.12)}
        strokeWidth="0.8"
        fill="none"
        strokeLinecap="round"
      />

      {/* Mouth — animated. Outer ellipse is the lip colour, inner is the
          "mouth interior" (slightly darker). On every frame the RAF resizes
          both, giving a visible open/close animation tied to volume + viseme.
          Initial dimensions match REST_SHAPE so first paint isn't oversized. */}
      <ellipse
        ref={lipRef}
        cx={MOUTH_CX}
        cy={MOUTH_CY}
        rx="6.2"
        ry="1.5"
        fill={p.lip}
      />
      <ellipse
        ref={mouthRef}
        cx={MOUTH_CX}
        cy={MOUTH_CY}
        rx="5.5"
        ry="0.8"
        fill="#3a1424"
      />
      {/* Top-front teeth — a small white strip that's revealed only when the
          mouth opens (the dark interior ellipse occludes it when closed). */}
      <rect
        x={MOUTH_CX - 4}
        y={MOUTH_CY - 0.8}
        width="8"
        height="1.6"
        rx="0.4"
        fill="#fffafc"
        opacity="0.92"
      />

      {/* Beard — rendered above the mouth so it covers the jaw/chin without
          masking the animated mouth ellipse. Only male presets opt in. */}
      {p.beard && (
        <path
          d="M28,64 Q32,82 50,84 Q68,82 72,64 Q60,70 50,70 Q40,70 28,64 Z"
          fill={darken(p.hair, 0.1)}
          opacity="0.85"
        />
      )}

      {/* Accessory overlay */}
      <Accessory variant={p.accessory} hair={p.hair} />
    </svg>
  );
}

// ─── Sub-elements ─────────────────────────────────────────────────────────

function Hair({ hair, variant }: { hair: string; variant: number }) {
  // Four hair silhouettes, deterministic from the seed:
  //   0 — bald / shaved (subtle scalp shadow only)
  //   1 — short crop
  //   2 — long flowing
  //   3 — top knot / bun
  switch (variant) {
    case 0:
      return (
        <path
          d="M22,46 Q50,16 78,46 Q78,38 50,30 Q22,38 22,46 Z"
          fill={hair}
          opacity="0.18"
        />
      );
    case 1:
      return (
        <path
          d="M18,52 Q50,12 82,52 Q86,38 78,30 Q50,18 22,30 Q14,38 18,52 Z"
          fill={hair}
        />
      );
    case 2:
      return (
        <>
          <path
            d="M14,54 Q50,10 86,54 L82,80 Q70,72 50,72 Q30,72 18,80 Z"
            fill={hair}
          />
          <path
            d="M28,68 Q50,60 72,68 Q66,84 50,84 Q34,84 28,68 Z"
            fill={hair}
            opacity="0.55"
          />
        </>
      );
    case 3:
    default:
      return (
        <>
          <path
            d="M22,46 Q50,16 78,46 Q78,36 50,30 Q22,36 22,46 Z"
            fill={hair}
          />
          <circle cx="50" cy="20" r="9" fill={hair} />
        </>
      );
  }
}

function Accessory({ variant, hair }: { variant: Accessory; hair: string }) {
  switch (variant) {
    case 'glasses':
      return (
        <g
          stroke="#1f1d2e"
          strokeWidth="1.8"
          fill="rgba(255, 255, 255, 0.05)"
          opacity="0.9"
        >
          <rect x="29" y="38" width="14" height="12" rx="2.4" />
          <rect x="57" y="38" width="14" height="12" rx="2.4" />
          <line x1="43" y1="44" x2="57" y2="44" />
        </g>
      );
    case 'headphones':
      return (
        <g fill="#1f1d2e">
          <path
            d="M18,46 Q50,10 82,46"
            stroke="#1f1d2e"
            strokeWidth="3"
            fill="none"
          />
          <rect x="14" y="42" width="9" height="14" rx="3" />
          <rect x="77" y="42" width="9" height="14" rx="3" />
        </g>
      );
    case 'cap':
      return (
        <>
          <path
            d="M20,42 Q50,18 80,42 L82,46 Q50,38 18,46 Z"
            fill={hair}
          />
          <rect x="20" y="44" width="60" height="3" rx="1.5" fill={darken(hair, 0.18)} />
        </>
      );
    case 'none':
    default:
      return null;
  }
}

// ─── Tiny colour math helpers ─────────────────────────────────────────────

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([a-f\d]{6})$/i.exec(hex);
  if (!m) return [0, 0, 0];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => Math.round(clamp01(v / 255) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function lighten(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
}

function darken(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}
