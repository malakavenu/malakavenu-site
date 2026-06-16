import { randomUUID } from 'node:crypto';
import type { MemeConcept, MemeFormatId, MemeMode } from '../../types';
import { MEME_FORMATS } from '../../data/templates';

const VALID_FORMATS = new Set(Object.keys(MEME_FORMATS));
const VALID_MODES: MemeMode[] = ['hype', 'attack', 'breaking', 'quote', 'celebrate'];

/** Strip markdown code fences / surrounding prose to isolate a JSON array. */
function extractJsonArray(raw: string): string {
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  const start = s.indexOf('[');
  const end = s.lastIndexOf(']');
  if (start !== -1 && end !== -1 && end > start) s = s.slice(start, end + 1);
  return s;
}

function asString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

/** Devanagari (Hindi/Marathi etc.) Unicode block — the studio must use Telugu. */
const DEVANAGARI_RE = /[\u0900-\u097F]/;

/** Collect every Telugu-intended text field from a concept for script checks. */
function teluguFieldsOf(c: MemeConcept): string[] {
  const fields = [c.headlineTe, c.subheadlineTe ?? '', c.quoteTe ?? '', c.captionTe];
  if (c.slotText) {
    for (const v of Object.values(c.slotText)) fields.push(v.te ?? '');
  }
  return fields.filter(Boolean);
}

function defaultModeFor(format: MemeFormatId): MemeMode {
  return MEME_FORMATS[format].defaultMode;
}

function defaultHashtagsFor(mode: MemeMode): string[] {
  switch (mode) {
    case 'attack':
      return ['#YSRCP', '#YSJagan', '#KutamiFailures'];
    case 'breaking':
      return ['#YSRCP', '#YSJagan'];
    case 'celebrate':
      return ['#YSRCP', '#YSJagan', '#Navaratnalu'];
    case 'quote':
      return ['#YSRCP', '#YSJagan'];
    default:
      return ['#YSRCP', '#YSJagan', '#APWithJagan'];
  }
}

function coerceConcept(raw: Record<string, unknown>): MemeConcept {
  const format = (
    VALID_FORMATS.has(asString(raw.format)) ? raw.format : 'headline-card'
  ) as MemeFormatId;

  const mode = (
    VALID_MODES.includes(asString(raw.mode) as MemeMode) ? raw.mode : defaultModeFor(format)
  ) as MemeMode;

  const faces = Array.isArray(raw.faces)
    ? (raw.faces as Record<string, unknown>[])
        .filter((f) => f && typeof f.leaderId === 'string')
        .map((f) => ({
          leaderId: asString(f.leaderId),
          expression: asString(f.expression, 'neutral'),
        }))
    : [];

  const stickers = Array.isArray(raw.stickers)
    ? (raw.stickers as unknown[]).map((s) => asString(s)).filter(Boolean)
    : [];

  const assetsNeeded = Array.isArray(raw.assetsNeeded)
    ? (raw.assetsNeeded as Record<string, unknown>[])
        .filter((a) => a && typeof a.description === 'string')
        .map((a) => ({
          kind: (['face', 'symbol', 'sticker'].includes(asString(a.kind))
            ? a.kind
            : 'sticker') as 'face' | 'symbol' | 'sticker',
          leaderId: a.leaderId ? asString(a.leaderId) : undefined,
          expression: a.expression ? asString(a.expression) : undefined,
          description: asString(a.description),
          suggestedQuery: asString(a.suggestedQuery),
          target: asString(a.target),
        }))
    : [];

  let slotText: MemeConcept['slotText'];
  if (raw.slotText && typeof raw.slotText === 'object') {
    slotText = {};
    for (const [k, v] of Object.entries(raw.slotText as Record<string, unknown>)) {
      if (v && typeof v === 'object') {
        const o = v as Record<string, unknown>;
        slotText[k] = { en: asString(o.en), te: asString(o.te) };
      }
    }
  }

  const hashtagsRaw = Array.isArray(raw.hashtags)
    ? (raw.hashtags as unknown[])
        .map((h) => asString(h).trim())
        .filter(Boolean)
        .map((h) => (h.startsWith('#') ? h : `#${h}`))
    : [];
  const hashtags = hashtagsRaw.length ? hashtagsRaw.slice(0, 5) : defaultHashtagsFor(mode);

  // Accept legacy captionEn/captionTe as fallback for headlines.
  const headlineEn = asString(raw.headlineEn) || asString(raw.captionEn);
  const headlineTe = asString(raw.headlineTe) || asString(raw.captionTe);

  return {
    id: randomUUID(),
    format,
    mode,
    headlineEn,
    headlineTe,
    subheadlineEn: raw.subheadlineEn ? asString(raw.subheadlineEn) : undefined,
    subheadlineTe: raw.subheadlineTe ? asString(raw.subheadlineTe) : undefined,
    quoteEn: raw.quoteEn ? asString(raw.quoteEn) : undefined,
    quoteTe: raw.quoteTe ? asString(raw.quoteTe) : undefined,
    quoteAttribution: raw.quoteAttribution ? asString(raw.quoteAttribution) : undefined,
    hashtags,
    handle: asString(raw.handle) || '@YSRCParty',
    slotText,
    imagePrompt: raw.imagePrompt ? asString(raw.imagePrompt) : undefined,
    punchline: raw.punchline ? asString(raw.punchline) : undefined,
    sourceQuote: asString(raw.sourceQuote),
    faces,
    stickers,
    assetsNeeded,
    captionEn: headlineEn,
    captionTe: headlineTe,
  };
}

/** Parse the model's raw text into MemeConcept[]. Throws on unrecoverable shape. */
export function parseConcepts(raw: string): MemeConcept[] {
  if (!raw || !raw.trim()) throw new Error('empty response');
  const json = extractJsonArray(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (err) {
    throw new Error(`not valid JSON (${(err as Error).message})`);
  }
  if (!Array.isArray(parsed)) throw new Error('response was not a JSON array');
  const concepts = parsed
    .filter((c): c is Record<string, unknown> => Boolean(c) && typeof c === 'object')
    .map(coerceConcept)
    .filter((c) => c.headlineEn || c.headlineTe);
  if (concepts.length === 0) throw new Error('no usable concepts in array');

  // Script guard: the Telugu fields must be in Telugu script, NOT Hindi/Devanagari.
  // Throwing here triggers the Cursor provider's corrective retry (and provider
  // fallback for one-shot providers) instead of shipping wrong-language memes.
  const hasDevanagari = concepts.some((c) =>
    teluguFieldsOf(c).some((t) => DEVANAGARI_RE.test(t)),
  );
  if (hasDevanagari) {
    throw new Error(
      'Telugu fields contained Hindi/Devanagari script — rewrite every "*Te" field in Telugu script (తెలుగు, Unicode U+0C00–U+0C7F).',
    );
  }

  return concepts;
}
