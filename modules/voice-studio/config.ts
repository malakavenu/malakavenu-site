import type { LanguageCode, LanguageEntry, LanguageGroup, VoiceStudioConfig } from './types';

// ─── Language Registry ──────────────────────────────────────────────────────

export const LANGUAGES: Record<LanguageCode, LanguageEntry> = {
  // === FEATURED (top-level chips) ===
  'en-IN': {
    label: 'English (Indian)', group: 'featured', isDefault: true,
    newsReader: { kind: 'hf-space', space: 'ai4bharat/indic-parler-tts', langCode: 'en' },
    clone: { default: { kind: 'hf-space', space: 'ai4bharat/IndicF5' } },
    voices: ['Ritu', 'Roopa', 'Aditi', 'Prakash', 'Arjun'],
  },
  'te-IN': {
    label: 'Telugu (తెలుగు)', group: 'featured',
    newsReader: { kind: 'hf-space', space: 'ai4bharat/indic-parler-tts', langCode: 'te' },
    clone: {
      default: { kind: 'hf-space', space: 'ai4bharat/IndicF5' },
      experimental: { kind: 'hf-space', space: 'Praxel/praxy-voice-r6', preprocess: 'iso15919' },
    },
    voices: ['Priya', 'Madhuri', 'Kiran'],
  },
  'mix': {
    label: 'Code-mix (English + Telugu/Hindi)', group: 'featured',
    newsReader: { kind: 'disabled' },
    clone: { default: { kind: 'hf-space', space: 'ai4bharat/IndicF5', preprocess: 'iso15919' } },
  },
  'en-US': {
    label: 'English (US — browser fast mode)', group: 'featured',
    newsReader: { kind: 'browser', model: 'kokoro-82m' },
    clone: { kind: 'disabled', reason: 'Use en-IN for high-quality Indian-accent cloning' },
    voices: ['af_heart', 'af_bella', 'af_nicole', 'am_adam', 'am_michael'],
  },

  // === INDIC GROUP ===
  'hi-IN': {
    label: 'Hindi (हिन्दी)', group: 'indic',
    newsReader: { kind: 'hf-space', space: 'ai4bharat/indic-parler-tts', langCode: 'hi' },
    clone: { default: { kind: 'hf-space', space: 'ai4bharat/IndicF5' } },
    voices: ['Rohit', 'Divya', 'Aman'],
  },
  'ta-IN': {
    label: 'Tamil (தமிழ்)', group: 'indic',
    newsReader: { kind: 'hf-space', space: 'ai4bharat/indic-parler-tts', langCode: 'ta' },
    clone: {
      default: { kind: 'hf-space', space: 'ai4bharat/IndicF5' },
      experimental: { kind: 'hf-space', space: 'Praxel/praxy-voice-r6', preprocess: 'iso15919' },
    },
    voices: ['Jaya', 'Kavya'],
  },
  'bn-IN': {
    label: 'Bengali (বাংলা)', group: 'indic',
    newsReader: { kind: 'hf-space', space: 'ai4bharat/indic-parler-tts', langCode: 'bn' },
    clone: { default: { kind: 'hf-space', space: 'ai4bharat/IndicF5' } },
  },
  'mr-IN': {
    label: 'Marathi (मराठी)', group: 'indic',
    newsReader: { kind: 'hf-space', space: 'ai4bharat/indic-parler-tts', langCode: 'mr' },
    clone: { default: { kind: 'hf-space', space: 'ai4bharat/IndicF5' } },
  },
  'gu-IN': {
    label: 'Gujarati (ગુજરાતી)', group: 'indic',
    newsReader: { kind: 'hf-space', space: 'ai4bharat/indic-parler-tts', langCode: 'gu' },
    clone: { default: { kind: 'hf-space', space: 'ai4bharat/IndicF5' } },
  },
  'kn-IN': {
    label: 'Kannada (ಕನ್ನಡ)', group: 'indic',
    newsReader: { kind: 'hf-space', space: 'ai4bharat/indic-parler-tts', langCode: 'kn' },
    clone: { default: { kind: 'hf-space', space: 'ai4bharat/IndicF5' } },
  },
  'ml-IN': {
    label: 'Malayalam (മലയാളം)', group: 'indic',
    newsReader: { kind: 'hf-space', space: 'ai4bharat/indic-parler-tts', langCode: 'ml' },
    clone: { default: { kind: 'hf-space', space: 'ai4bharat/IndicF5' } },
  },
  'pa-IN': {
    label: 'Punjabi (ਪੰਜਾਬੀ)', group: 'indic',
    newsReader: { kind: 'hf-space', space: 'ai4bharat/indic-parler-tts', langCode: 'pa' },
    clone: { default: { kind: 'hf-space', space: 'ai4bharat/IndicF5' } },
  },
  'or-IN': {
    label: 'Odia (ଓଡ଼ିଆ)', group: 'indic',
    newsReader: { kind: 'hf-space', space: 'ai4bharat/indic-parler-tts', langCode: 'or' },
    clone: { default: { kind: 'hf-space', space: 'ai4bharat/IndicF5' } },
  },
  'as-IN': {
    label: 'Assamese (অসমীয়া)', group: 'indic',
    newsReader: { kind: 'hf-space', space: 'ai4bharat/indic-parler-tts', langCode: 'as' },
    clone: { default: { kind: 'hf-space', space: 'ai4bharat/IndicF5' } },
  },
  'ur-IN': {
    label: 'Urdu (اُردُو)', group: 'indic',
    newsReader: { kind: 'hf-space', space: 'ai4bharat/indic-parler-tts', langCode: 'ur' },
    clone: { kind: 'disabled' },
  },
  'ne-IN': {
    label: 'Nepali (नेपाली)', group: 'indic',
    newsReader: { kind: 'hf-space', space: 'ai4bharat/indic-parler-tts', langCode: 'ne' },
    clone: { kind: 'disabled' },
  },
  'sa-IN': {
    label: 'Sanskrit (संस्कृतम्)', group: 'indic',
    newsReader: { kind: 'hf-space', space: 'ai4bharat/indic-parler-tts', langCode: 'sa' },
    clone: { kind: 'disabled' },
  },
  'kok-IN': {
    label: 'Konkani (कोंकणी)', group: 'indic',
    newsReader: { kind: 'hf-space', space: 'ai4bharat/indic-parler-tts', langCode: 'kok' },
    clone: { kind: 'disabled' },
  },
  'mai-IN': {
    label: 'Maithili (मैथिली)', group: 'indic',
    newsReader: { kind: 'hf-space', space: 'ai4bharat/indic-parler-tts', langCode: 'mai' },
    clone: { kind: 'disabled' },
  },
  'brx-IN': {
    label: 'Bodo (बड़ो)', group: 'indic',
    newsReader: { kind: 'hf-space', space: 'ai4bharat/indic-parler-tts', langCode: 'brx' },
    clone: { kind: 'disabled' },
  },
  'doi-IN': {
    label: 'Dogri (डोगरी)', group: 'indic',
    newsReader: { kind: 'hf-space', space: 'ai4bharat/indic-parler-tts', langCode: 'doi' },
    clone: { kind: 'disabled' },
  },
  'mni-IN': {
    label: 'Manipuri (ꯃꯩꯇꯩꯂꯣꯟ)', group: 'indic',
    newsReader: { kind: 'hf-space', space: 'ai4bharat/indic-parler-tts', langCode: 'mni' },
    clone: { kind: 'disabled' },
  },
  'sat-IN': {
    label: 'Santali (ᱥᱟᱱᱛᱟᱲᱤ)', group: 'indic',
    newsReader: { kind: 'hf-space', space: 'ai4bharat/indic-parler-tts', langCode: 'sat' },
    clone: { kind: 'disabled' },
  },
  'sd-IN': {
    label: 'Sindhi (سنڌي)', group: 'indic',
    newsReader: { kind: 'hf-space', space: 'ai4bharat/indic-parler-tts', langCode: 'sd' },
    clone: { kind: 'disabled' },
  },

  // === BROWSER GROUP (Kokoro, in-browser only) ===
  'en-GB': {
    label: 'English (UK — browser)', group: 'browser',
    newsReader: { kind: 'browser', model: 'kokoro-82m', langCode: 'en-gb' },
    clone: { kind: 'disabled' },
    voices: ['bf_emma', 'bf_isabella', 'bm_george'],
  },
  'ja': {
    label: 'Japanese (日本語 — browser)', group: 'browser',
    newsReader: { kind: 'browser', model: 'kokoro-82m', langCode: 'ja' },
    clone: { kind: 'disabled' },
  },
  'zh': {
    label: 'Mandarin (中文 — browser)', group: 'browser',
    newsReader: { kind: 'browser', model: 'kokoro-82m', langCode: 'zh' },
    clone: { kind: 'disabled' },
  },
  'ko': {
    label: 'Korean (한국어 — browser)', group: 'browser',
    newsReader: { kind: 'browser', model: 'kokoro-82m', langCode: 'ko' },
    clone: { kind: 'disabled' },
  },
  'es': {
    label: 'Spanish (Español — browser)', group: 'browser',
    newsReader: { kind: 'browser', model: 'kokoro-82m', langCode: 'es' },
    clone: { kind: 'disabled' },
  },
  'fr': {
    label: 'French (Français — browser)', group: 'browser',
    newsReader: { kind: 'browser', model: 'kokoro-82m', langCode: 'fr' },
    clone: { kind: 'disabled' },
  },
  'pt': {
    label: 'Portuguese (Português — browser)', group: 'browser',
    newsReader: { kind: 'browser', model: 'kokoro-82m', langCode: 'pt' },
    clone: { kind: 'disabled' },
  },
  'it': {
    label: 'Italian (Italiano — browser)', group: 'browser',
    newsReader: { kind: 'browser', model: 'kokoro-82m', langCode: 'it' },
    clone: { kind: 'disabled' },
  },
};

// ─── Commercial Upgrade Paths (documented, not built in v1) ─────────────────

export const COMMERCIAL_UPGRADES = {
  sarvamBulbulV3: {
    enableEnvVar: 'SARVAM_API_KEY',
    endpoint: 'https://api.sarvam.ai/text-to-speech',
    coverage: ['en-IN', 'hi-IN', 'ta-IN', 'te-IN', 'bn-IN', 'ml-IN', 'mr-IN', 'gu-IN', 'kn-IN', 'pa-IN', 'or-IN'] as LanguageCode[],
    notes: 'Indian-accent SOTA, paid (~Rs 30 per 10K chars), beats ElevenLabs in 20K-vote blind tests',
  },
  elevenLabs: {
    enableEnvVar: 'ELEVENLABS_API_KEY',
    endpoint: 'https://api.elevenlabs.io/v1/text-to-speech',
    coverage: ['en-US', 'en-GB'] as LanguageCode[],
    notes: 'Premium en-US/UK polish + sub-300ms streaming + long-form consistency. Paid.',
  },
} as const;

// ─── Defaults & Factory ─────────────────────────────────────────────────────

/**
 * PROVIDER_MAP — maps panel + language group to available providers.
 * Used by pickProviderChain() to build the fallback chain.
 * LANGUAGES is kept as-is for backward compat.
 */
export const PROVIDER_MAP: Record<string, Record<string, string[]>> = {
  narrate: {
    indic:   ['indic-parler', 'edge-tts', 'kokoro'],
    western: ['edge-tts', 'kokoro'],
    browser: ['kokoro'],
  },
  clone: {
    indic:   ['indicf5', 'chatterbox-browser', 'openvoice-v2'],
    western: ['indicf5', 'openvoice-v2', 'f5-browser'],
  },
  convert: {
    any:     ['seed-vc', 'openvoice-v2'],
  },
  translate: {
    any:     ['indictrans', 'mymemory-browser'],
  },
};

export const DEFAULT_CONFIG: VoiceStudioConfig = {
  basePath: '/voice-studio',
  apiBasePath: '/api/voice-studio',
  defaultLanguage: 'en-IN',
  featuredLanguages: ['en-IN', 'te-IN', 'mix', 'en-US'],
  enabledGroups: ['featured', 'indic', 'browser'],
  enableExperimentalEngines: true,
  useHfBoost: false,
  enableAvatar: true,
  defaultAvatarId: 'aria',
  theme: 'auto',
  adapters: {},
};

export function createVoiceStudioConfig(
  overrides: Partial<VoiceStudioConfig> = {}
): VoiceStudioConfig {
  return { ...DEFAULT_CONFIG, ...overrides };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export function getLanguagesByGroup(group: LanguageGroup): [LanguageCode, LanguageEntry][] {
  return (Object.entries(LANGUAGES) as [LanguageCode, LanguageEntry][])
    .filter(([, entry]) => entry.group === group);
}

export function getEnabledLanguages(config: VoiceStudioConfig): [LanguageCode, LanguageEntry][] {
  return (Object.entries(LANGUAGES) as [LanguageCode, LanguageEntry][])
    .filter(([, entry]) => config.enabledGroups.includes(entry.group));
}
