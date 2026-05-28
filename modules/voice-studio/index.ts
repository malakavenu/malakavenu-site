// ─── Voice Studio Public API ────────────────────────────────────────────────

export { VoiceStudio } from './ui/VoiceStudio';
export {
  handleNarrate,
  handleClone,
  handleConvert,
  handleTranslate,
} from './server/handlers';
export { createVoiceStudioConfig, DEFAULT_CONFIG, LANGUAGES } from './config';
export { translateInBrowser } from './client/translate';
export { pickProviderChain } from './server/provider-tiers';
export type {
  VoiceStudioConfig,
  VoiceStudioAdapters,
  LanguageCode,
  Tone,
  Engine,
  ProviderId,
  Tier,
  VoiceSample,
  PresetVoice,
} from './types';
