// ─── Meme Studio Types ──────────────────────────────────────────────────────

/** Caption languages supported by the studio. */
export type Language = 'en' | 'te';

/** Which opposition target a meme is aimed at (or none). */
export type TargetParty = 'tdp' | 'janasena' | 'bjp' | 'kutami' | 'general';

/** Recognized, high-engagement meme formats (see data/templates.ts). */
export type MemeFormatId =
  | 'headline-card'
  | 'attack-card'
  | 'quote-card'
  | 'news-card'
  | 'celebration-card'
  | 'vs-panel'
  | 'promise-vs-reality'
  | 'image-macro'
  | 'stats-card'
  | 'protest-banner'
  | 'heritage-card';

/** Visual mode of a brand card — drives gradient palette + accents. */
export type MemeMode = 'hype' | 'attack' | 'breaking' | 'quote' | 'celebrate';

/** Tone of the generated captions. */
export type MemeTone = 'satirical' | 'celebratory' | 'sarcastic' | 'wholesome' | 'savage';

// ─── AI providers ─────────────────────────────────────────────────────────────

/** Text (caption/idea) provider identifiers. */
export type TextProviderId = 'cursor' | 'anthropic' | 'openai' | 'pollinations';

/** Image provider identifiers. ('cursor' emits SVG vector art.) */
export type ImageProviderId = 'cursor' | 'openai' | 'pollinations';

/** Which provider to use, or 'auto' to pick the best configured one. */
export type TextProviderPref = 'auto' | TextProviderId;
export type ImageProviderPref = 'auto' | ImageProviderId;

// ─── Faces & assets ─────────────────────────────────────────────────────────

/** A leader in the curated face library (public/meme-studio/faces). */
export interface LeaderFace {
  /** Stable id, also the folder name e.g. "jagan". */
  leaderId: string;
  /** Display name e.g. "YS Jagan Mohan Reddy". */
  name: string;
  /** Party affiliation (free-form short code e.g. "ysrcp", "tdp"). */
  party: string;
  /** Available photos tagged by expression. */
  photos: LeaderPhoto[];
}

export interface LeaderPhoto {
  /** File name within the leader folder, e.g. "smiling.png". */
  file: string;
  /** Expression / mood tag e.g. "smiling", "serious", "waving". */
  expression: string;
  /** Optional source URL recorded when the file was added. */
  sourceUrl?: string;
}

/** An illustration / sticker / symbol asset (public/meme-studio/assets). */
export interface MemeAsset {
  id: string;
  category: 'symbols' | 'bubbles' | 'stickers' | 'stamps' | 'banners';
  file: string;
  tags: string[];
}

// ─── Meme concept (LLM output) ──────────────────────────────────────────────

/** A face the LLM suggests placing in the meme. */
export interface ConceptFace {
  leaderId: string;
  expression: string;
}

/** Something the user should download & drop into the library to nail this meme. */
export interface AssetNeeded {
  kind: 'face' | 'symbol' | 'sticker';
  /** For faces. */
  leaderId?: string;
  expression?: string;
  /** Human description of what's needed. */
  description: string;
  /** Suggested web/Google search term. */
  suggestedQuery: string;
  /** Where the downloaded file should be placed. */
  target: string;
}

/**
 * A single meme idea produced by the text provider. Grounded in a transcript
 * quote; carries everything the compositor + studio need to render it.
 */
export interface MemeConcept {
  id: string;
  format: MemeFormatId;
  /** Visual mode of the card — drives gradient palette + accents. */
  mode: MemeMode;
  /** SHORT bold headline that becomes the dominant line of the card (≤8 words). */
  headlineEn: string;
  headlineTe: string;
  /** Optional smaller kicker / subheadline (≤12 words). */
  subheadlineEn?: string;
  subheadlineTe?: string;
  /**
   * Optional pull-quote (for quote/news cards). When set, the renderer styles
   * it with quote marks and an attribution.
   */
  quoteTe?: string;
  quoteEn?: string;
  /** Whose quote it is (display name). */
  quoteAttribution?: string;
  /** 3–5 short hashtags — Telugu + English ok. Rendered as pill row. */
  hashtags: string[];
  /** Always "@YSRCParty" unless explicitly overridden by the user. */
  handle: string;
  /** Optional per-slot text (legacy formats e.g. vs-panel: { left, right, vs }). */
  slotText?: Record<string, { en: string; te: string }>;
  /** Optional AI scene prompt for power users in Studio (NOT used in auto-feed). */
  imagePrompt?: string;
  /** Short, optional Tollywood-style punchline. */
  punchline?: string;
  /** The transcript line this riffs on (keeps it grounded/defensible). */
  sourceQuote: string;
  /** Suggested leader faces (real photos from the curated library). */
  faces: ConceptFace[];
  /** Suggested sticker/symbol asset ids or tags. */
  stickers: string[];
  /** Images the user should fetch to complete this meme. */
  assetsNeeded: AssetNeeded[];

  // ── Legacy compatibility (older code paths) ───────────────────────────
  /** @deprecated Use headlineEn — preserved for backward compatibility. */
  captionEn: string;
  /** @deprecated Use headlineTe — preserved for backward compatibility. */
  captionTe: string;
}

// ─── Transcript ─────────────────────────────────────────────────────────────

export interface TranscriptSegment {
  text: string;
  offsetSec: number;
  durationSec: number;
}

export interface TranscriptResult {
  videoId: string;
  source: 'youtube' | 'pasted';
  language?: string;
  segments: TranscriptSegment[];
  text: string;
  /** Non-fatal advisory, e.g. when fetched captions aren't Telugu/English. */
  warning?: string;
}

// ─── Adapters & config ──────────────────────────────────────────────────────

export interface MemeStudioAdapters {
  env?: {
    CURSOR_API_KEY?: string;
    CURSOR_MODEL?: string;
    OPENAI_API_KEY?: string;
    ANTHROPIC_API_KEY?: string;
    POLLINATIONS_API_KEY?: string;
  };
  logger?: {
    info: (msg: string, meta?: Record<string, unknown>) => void;
    warn: (msg: string, meta?: Record<string, unknown>) => void;
    error: (msg: string, meta?: Record<string, unknown>) => void;
  };
}

export interface MemeStudioConfig {
  basePath: string;
  apiBasePath: string;
  /** Default caption language. */
  defaultLanguage: Language;
  /** Languages offered in the UI. */
  languages: Language[];
  /** Default opposition target. */
  defaultTarget: TargetParty;
  /** Preferred text (caption) provider. Default 'auto' → Cursor first. */
  textProvider: TextProviderPref;
  /** Preferred image provider. Default 'auto' → OpenAI gpt-image-2 first. */
  imageProvider: ImageProviderPref;
  /** Cursor SDK model id for captions. */
  cursorModel: string;
  /** Default image model id for the active image provider. */
  imageModel: string;
  /** Initial theme. */
  theme?: 'dark' | 'light' | 'auto';
  adapters: MemeStudioAdapters;
}

/** Top-level views in the studio. */
export type PanelId = 'feed' | 'studio' | 'history';

// ─── API payloads ───────────────────────────────────────────────────────────

export interface TranscriptRequestBody {
  url?: string;
  text?: string;
}

export interface IdeasRequestBody {
  transcript: string;
  language: Language | 'both';
  target: TargetParty;
  tone: MemeTone;
  count: number;
  /** leaderIds present in the face manifest, so the LLM only picks valid ones. */
  knownLeaders: string[];
  /**
   * Optional ID(s) of a "live attack issue" from knowledge.ts the user wants
   * to anchor the memes to (e.g. 'adabidda-nidhi', 'visakha-steel'). Empty =
   * let the model pick freely from the transcript.
   */
  focusIssues?: string[];
}

export interface IdeasResponse {
  concepts: MemeConcept[];
  provider: TextProviderId;
  model: string;
}

export interface ImageRequestBody {
  prompt: string;
  width?: number;
  height?: number;
  transparent?: boolean;
}

export interface AssetGenRequestBody {
  /** What to draw (e.g. the AssetNeeded.description). */
  prompt: string;
  /** Library category to save into. */
  category: MemeAsset['category'];
  /** Optional tags stored in the manifest. */
  tags?: string[];
  /** Request a transparent background (honored by gpt-image-2). Default true. */
  transparent?: boolean;
}

export interface AssetGenResponse {
  asset: MemeAsset;
  url: string;
  provider: ImageProviderId;
  model: string;
}
