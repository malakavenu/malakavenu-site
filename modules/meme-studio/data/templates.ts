import type { MemeFormatId, MemeMode } from '../types';

/**
 * Meme FORMAT catalog — branded card layouts that mirror the @YSRCParty
 * social-media visual language. Each format describes a deterministic
 * rendering recipe consumed by `client/brand-compositor.ts`.
 */

export type SlotStyle = 'impact' | 'bar' | 'bubble' | 'plain';

export interface TextSlot {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  align: 'left' | 'center' | 'right';
  style: SlotStyle;
  label: string;
}

export interface FaceSlot {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}

export interface MemeFormat {
  id: MemeFormatId;
  name: string;
  bestFor: string;
  /** Default mode for this format (LLM can override). */
  defaultMode: MemeMode;
  aspect: { w: number; h: number };
  textSlots: TextSlot[];
  faceSlots: FaceSlot[];
}

export const MEME_FORMATS: Record<MemeFormatId, MemeFormat> = {
  /** Big bold Telugu headline + hashtag pills + fan watermark. Matches @YSRCParty post style. */
  'headline-card': {
    id: 'headline-card',
    name: 'YSRCP headline card',
    bestFor:
      'Bold one-line statement / declaration in YSRCP party-blue, like the main @YSRCParty Twitter posts.',
    defaultMode: 'hype',
    aspect: { w: 1, h: 1 },
    textSlots: [
      { id: 'headline', x: 0.5, y: 0.42, w: 0.86, h: 0.34, align: 'center', style: 'plain', label: 'Headline' },
      { id: 'subheadline', x: 0.5, y: 0.66, w: 0.86, h: 0.1, align: 'center', style: 'plain', label: 'Subheadline' },
    ],
    faceSlots: [],
  },

  /** Red/yellow attack card — bold accusation + opposition photo slot + hashtags. */
  'attack-card': {
    id: 'attack-card',
    name: 'Attack / call-out card',
    bestFor:
      'Sharp accusation against Kutami leaders (Naidu / Pawan / BJP). Red ribbon, dark moody background, opposition photo on the right.',
    defaultMode: 'attack',
    aspect: { w: 1, h: 1 },
    textSlots: [
      { id: 'kicker', x: 0.5, y: 0.1, w: 0.6, h: 0.07, align: 'center', style: 'plain', label: 'Top ribbon text (e.g. ‘ANOTHER BROKEN PROMISE’)' },
      { id: 'headline', x: 0.32, y: 0.48, w: 0.58, h: 0.34, align: 'left', style: 'plain', label: 'Headline (Telugu)' },
      { id: 'subheadline', x: 0.32, y: 0.72, w: 0.58, h: 0.1, align: 'left', style: 'plain', label: 'Subheadline / context' },
    ],
    faceSlots: [{ id: 'target', x: 0.78, y: 0.5, w: 0.36, h: 0.6, label: 'Target leader (right side)' }],
  },

  /** Pull-quote card with leader photo on the left. */
  'quote-card': {
    id: 'quote-card',
    name: 'Quote card',
    bestFor:
      'Punchy quote from Jagan or another YSRCP leader rendered as a styled pull-quote with attribution.',
    defaultMode: 'quote',
    aspect: { w: 1, h: 1 },
    textSlots: [
      { id: 'quote', x: 0.6, y: 0.48, w: 0.7, h: 0.46, align: 'left', style: 'plain', label: 'Quote text' },
      { id: 'attribution', x: 0.6, y: 0.84, w: 0.7, h: 0.08, align: 'left', style: 'plain', label: 'Attribution' },
    ],
    faceSlots: [{ id: 'speaker', x: 0.22, y: 0.5, w: 0.34, h: 0.6, label: 'Speaker (left)' }],
  },

  /** News-style breaking card — red badge at top + factual statement. */
  'news-card': {
    id: 'news-card',
    name: 'News / breaking card',
    bestFor:
      'Factual statement from a press meet / event. Top "BREAKING" badge, neutral grey/blue palette.',
    defaultMode: 'breaking',
    aspect: { w: 1, h: 1 },
    textSlots: [
      { id: 'kicker', x: 0.5, y: 0.12, w: 0.4, h: 0.07, align: 'center', style: 'plain', label: 'BREAKING badge text' },
      { id: 'headline', x: 0.5, y: 0.5, w: 0.86, h: 0.46, align: 'center', style: 'plain', label: 'News headline' },
    ],
    faceSlots: [],
  },

  /** Celebration card — vivid hero-card around Jagan with positive Telugu. */
  'celebration-card': {
    id: 'celebration-card',
    name: 'Celebration card',
    bestFor:
      'Pro-YSRCP feel-good hype — Jagan-focused, vivid blue+gold gradient, "Jagananna" energy.',
    defaultMode: 'celebrate',
    aspect: { w: 1, h: 1 },
    textSlots: [
      { id: 'headline', x: 0.5, y: 0.84, w: 0.86, h: 0.16, align: 'center', style: 'plain', label: 'Celebration line' },
    ],
    faceSlots: [{ id: 'hero', x: 0.5, y: 0.42, w: 0.6, h: 0.68, label: 'Hero figure (centered)' }],
  },

  /** Two-leader head-to-head split. */
  'vs-panel': {
    id: 'vs-panel',
    name: 'VS (head-to-head)',
    bestFor: 'YSRCP leader vs Kutami leader, split-panel, big VS in the middle.',
    defaultMode: 'attack',
    aspect: { w: 16, h: 9 },
    textSlots: [
      { id: 'left', x: 0.25, y: 0.88, w: 0.45, h: 0.12, align: 'center', style: 'bar', label: 'Left caption' },
      { id: 'right', x: 0.75, y: 0.88, w: 0.45, h: 0.12, align: 'center', style: 'bar', label: 'Right caption' },
      { id: 'vs', x: 0.5, y: 0.5, w: 0.16, h: 0.2, align: 'center', style: 'impact', label: 'VS' },
    ],
    faceSlots: [
      { id: 'leftFace', x: 0.25, y: 0.45, w: 0.42, h: 0.7, label: 'Left leader (YSRCP)' },
      { id: 'rightFace', x: 0.75, y: 0.45, w: 0.42, h: 0.7, label: 'Right leader (Kutami)' },
    ],
  },

  /** Promise vs reality split horizontal. */
  'promise-vs-reality': {
    id: 'promise-vs-reality',
    name: 'Promise vs Reality',
    bestFor: 'Contrast a Kutami promise (top) with the reality / outcome (bottom).',
    defaultMode: 'attack',
    aspect: { w: 1, h: 1 },
    textSlots: [
      { id: 'kicker', x: 0.5, y: 0.05, w: 0.5, h: 0.07, align: 'center', style: 'plain', label: 'Top ribbon' },
      { id: 'promise', x: 0.5, y: 0.28, w: 0.86, h: 0.18, align: 'center', style: 'plain', label: 'Promised' },
      { id: 'reality', x: 0.5, y: 0.72, w: 0.86, h: 0.18, align: 'center', style: 'plain', label: 'Reality' },
    ],
    faceSlots: [],
  },

  /** Legacy classic image-macro (still supported for Studio). */
  'image-macro': {
    id: 'image-macro',
    name: 'Image macro (top/bottom text)',
    bestFor: 'Classic impact-text macro over an image. Used when other formats don’t fit.',
    defaultMode: 'hype',
    aspect: { w: 1, h: 1 },
    textSlots: [
      { id: 'top', x: 0.5, y: 0.08, w: 0.9, h: 0.18, align: 'center', style: 'impact', label: 'Top text' },
      { id: 'bottom', x: 0.5, y: 0.92, w: 0.9, h: 0.18, align: 'center', style: 'impact', label: 'Bottom text' },
    ],
    faceSlots: [{ id: 'subject', x: 0.5, y: 0.5, w: 0.6, h: 0.6, label: 'Subject' }],
  },

  /**
   * Big welfare-stat / impact-number card.
   * Renders a gold giant number at centre, headline below, sub below that.
   * Mirrors the @YSRCParty "₹2.7 Lakh Crore to welfare" infographic posts.
   */
  'stats-card': {
    id: 'stats-card',
    name: 'Impact stats card',
    bestFor:
      'Big bold welfare statistic or government-failure number (e.g. "₹2.7 లక్షల కోట్లు సంక్షేమానికి", "Super Six లో 0 పూర్తి"). Party-blue with gold accent giant number. Great for data-driven accountability posts.',
    defaultMode: 'hype',
    aspect: { w: 1, h: 1 },
    textSlots: [
      { id: 'stat', x: 0.5, y: 0.35, w: 0.88, h: 0.24, align: 'center', style: 'impact', label: 'The big number / stat (e.g. ₹2.7 Lakh Crore)' },
      { id: 'headline', x: 0.5, y: 0.58, w: 0.86, h: 0.18, align: 'center', style: 'plain', label: 'What the stat means (Telugu headline)' },
      { id: 'subheadline', x: 0.5, y: 0.76, w: 0.82, h: 0.1, align: 'center', style: 'plain', label: 'Context / time period' },
    ],
    faceSlots: [],
  },

  /**
   * Protest march / rally announcement banner — 16:9 landscape.
   * Red diagonal slash across dark background, march energy, date/place CTA.
   * Mirrors YSRCP "Chalo Pothireddypadu" and "Two Years of Backstabbing" banners.
   */
  'protest-banner': {
    id: 'protest-banner',
    name: 'Protest march banner',
    bestFor:
      'Statewide rally / dharna announcement or "Two Years of Backstabbing" march card. Red diagonal slash, crowd energy. Put event name in kicker, main demand in headline, date+location in subheadline.',
    defaultMode: 'attack',
    aspect: { w: 16, h: 9 },
    textSlots: [
      { id: 'kicker', x: 0.5, y: 0.16, w: 0.78, h: 0.12, align: 'center', style: 'plain', label: 'Event name / campaign slogan (e.g. వెన్నుపోటుకు రెండేళ్లు)' },
      { id: 'headline', x: 0.46, y: 0.5, w: 0.82, h: 0.32, align: 'center', style: 'plain', label: 'Main protest demand / rally message' },
      { id: 'subheadline', x: 0.46, y: 0.78, w: 0.78, h: 0.11, align: 'center', style: 'plain', label: 'Date / location / time' },
    ],
    faceSlots: [{ id: 'leader', x: 0.9, y: 0.5, w: 0.18, h: 0.8, label: 'Leader cutout (right edge)' }],
  },

  /**
   * YSR heritage / lineage card — father-to-son legacy framing.
   * Left: YSR sepia-tinted; right: Jagan in party-blue.
   * Headline at bottom in gold. Use for "మేరునగ ధీరుడు" and legacy memes.
   */
  'heritage-card': {
    id: 'heritage-card',
    name: 'YSR heritage card',
    bestFor:
      'Father YSR → son Jagan legacy memes. Split sepia/blue card, "మేరునగ ధీరుడు" and "Jagananna" energy. Best for tribute posts, anniversary memes, and lineage-pride content.',
    defaultMode: 'celebrate',
    aspect: { w: 1, h: 1 },
    textSlots: [
      { id: 'headline', x: 0.5, y: 0.81, w: 0.86, h: 0.13, align: 'center', style: 'plain', label: 'Heritage slogan (e.g. మేరునగ ధీరుడు నాయన వారసత్వం)' },
      { id: 'subheadline', x: 0.5, y: 0.93, w: 0.86, h: 0.07, align: 'center', style: 'plain', label: 'Legacy context line' },
    ],
    faceSlots: [
      { id: 'heritage', x: 0.28, y: 0.42, w: 0.46, h: 0.62, label: 'YSR / heritage figure (left side)' },
      { id: 'current', x: 0.74, y: 0.42, w: 0.46, h: 0.62, label: 'Jagan / current leader (right side)' },
    ],
  },
};

export const MEME_FORMAT_LIST: MemeFormat[] = Object.values(MEME_FORMATS);
