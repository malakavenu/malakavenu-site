// ─── Voice Studio Types ─────────────────────────────────────────────────────

/** Supported language codes */
export type LanguageCode =
  // Featured
  | 'en-IN' | 'te-IN' | 'mix' | 'en-US'
  // Indic
  | 'hi-IN' | 'ta-IN' | 'bn-IN' | 'mr-IN' | 'gu-IN' | 'kn-IN' | 'ml-IN'
  | 'pa-IN' | 'or-IN' | 'as-IN' | 'ur-IN' | 'ne-IN' | 'sa-IN' | 'kok-IN'
  | 'mai-IN' | 'brx-IN' | 'doi-IN' | 'mni-IN' | 'sat-IN' | 'sd-IN'
  // Browser (Kokoro)
  | 'en-GB' | 'ja' | 'zh' | 'ko' | 'es' | 'fr' | 'pt' | 'it';

export type LanguageGroup = 'featured' | 'indic' | 'browser';

export type TtsKind = 'hf-space' | 'browser' | 'disabled';

export interface HfSpaceTtsConfig {
  kind: 'hf-space';
  space: string;
  langCode?: string;
}

export interface BrowserTtsConfig {
  kind: 'browser';
  model: 'kokoro-82m';
  langCode?: string;
}

export interface DisabledTtsConfig {
  kind: 'disabled';
  reason?: string;
}

export type NewsReaderConfig = HfSpaceTtsConfig | BrowserTtsConfig | DisabledTtsConfig;

export interface CloneEngineConfig {
  kind: 'hf-space';
  space: string;
  preprocess?: 'iso15919';
}

export interface DisabledCloneConfig {
  kind: 'disabled';
  reason?: string;
}

export interface CloneConfig {
  default?: CloneEngineConfig | DisabledCloneConfig;
  experimental?: CloneEngineConfig;
}

export interface LanguageEntry {
  label: string;
  group: LanguageGroup;
  isDefault?: boolean;
  newsReader: NewsReaderConfig;
  clone: CloneConfig | DisabledCloneConfig;
  voices?: string[];
}

/** Tone/style attributes for Indic Parler-TTS */
export type Tone =
  | 'neutral'
  | 'warm'
  | 'energetic'
  | 'calm'
  | 'authoritative'
  | 'conversational';

/** Engine selection for voice cloning / conversion */
export type Engine =
  | 'openvoice'
  | 'chatterbox'
  | 'f5-en'
  | 'indicf5'
  | 'praxy-r6'
  | 'parler-tts'
  | 'seed-vc'
  | 'edge-tts';

/** Provider identifiers used in the fallback chain */
export type ProviderId =
  | 'indic-parler'
  | 'edge-tts'
  | 'kokoro'
  | 'indicf5'
  | 'openvoice-v2'
  | 'f5-browser'
  | 'chatterbox-browser'
  | 'seed-vc'
  | 'indictrans'
  | 'mymemory-browser';

/** Provider tier classification */
export type Tier = 'hf-boost' | 'free-server' | 'browser';

/** A voice sample — either uploaded, recorded, or preset */
export interface VoiceSample {
  id: string;
  source: 'upload' | 'mic' | 'preset';
  audioBlob?: Blob;
  audioUrl?: string;
  transcript: string;
  language: LanguageCode;
  durationSec?: number;
}

/** Preset voice from bundled samples */
export interface PresetVoice {
  id: string;
  language: LanguageCode;
  audio: string;
  transcript: string;
  durationSec: number;
  voiceAttributes: string;
  license: string;
  source: string;
}

/** Adapters injected by the host app */
export interface VoiceStudioAdapters {
  analytics?: {
    track: (event: string, props?: Record<string, unknown>) => void;
  };
  cache?: {
    get: (key: string) => Promise<ArrayBuffer | null>;
    set: (key: string, value: ArrayBuffer, ttlMs?: number) => Promise<void>;
  };
  env?: {
    HF_TOKEN?: string;
    SARVAM_API_KEY?: string;
    ELEVENLABS_API_KEY?: string;
  };
  logger?: {
    info: (msg: string, meta?: Record<string, unknown>) => void;
    warn: (msg: string, meta?: Record<string, unknown>) => void;
    error: (msg: string, meta?: Record<string, unknown>) => void;
  };
}

/** Top-level configuration for the Voice Studio module */
export interface VoiceStudioConfig {
  basePath: string;
  apiBasePath: string;
  defaultLanguage: LanguageCode;
  featuredLanguages: LanguageCode[];
  enabledGroups: LanguageGroup[];
  enableExperimentalEngines: boolean;
  /** Enable HF Boost tier (ZeroGPU-backed providers). Default: false */
  useHfBoost?: boolean;
  /** Enable the speaking avatar (hero stage). Default: true */
  enableAvatar?: boolean;
  /** Default avatar preset id (see modules/voice-studio/ui/avatar/presets.ts) */
  defaultAvatarId?: string;
  /** Initial theme. 'auto' follows system preference. Default: 'auto' */
  theme?: 'dark' | 'light' | 'auto';
  adapters: VoiceStudioAdapters;
}

/** Panel identifiers */
export type PanelId = 'news-reader' | 'voice-clone' | 'voice-convert' | 'translate-speak';

/** Narrate request payload */
export interface NarrateRequest {
  text: string;
  language: LanguageCode;
  voice?: string;
  tone?: Tone;
}

/** Clone request payload */
export interface CloneRequest {
  text: string;
  language: LanguageCode;
  referenceAudio: Blob;
  referenceTranscript: string;
  engine?: Engine;
}

/** Convert request payload */
export interface ConvertRequest {
  sourceAudio: Blob;
  referenceAudio: Blob;
}

/** Translate request payload */
export interface TranslateRequest {
  text: string;
  sourceLang: LanguageCode;
  targetLang: LanguageCode;
  voice?: string;
  tone?: Tone;
}

/** Generic API response */
export interface VoiceStudioResponse {
  audio?: ArrayBuffer;
  audioUrl?: string;
  translatedText?: string;
  error?: string;
  durationMs?: number;
  engine?: string;
}
