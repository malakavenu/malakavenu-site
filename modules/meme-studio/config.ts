import type { Language, MemeStudioConfig, TargetParty } from './types';

/** Default Cursor SDK caption model — mirrors the COREUI cursor-bridge default. */
export const DEFAULT_CURSOR_MODEL = 'claude-opus-4-7';

/** Default OpenAI image model. */
export const DEFAULT_IMAGE_MODEL = 'gpt-image-2';

/** UI labels for caption languages. */
export const LANGUAGE_LABELS: Record<Language, string> = {
  en: 'English',
  te: 'తెలుగు (Telugu)',
};

/** UI labels for opposition targets. */
export const TARGET_LABELS: Record<TargetParty, string> = {
  tdp: 'TDP (Chandrababu Naidu)',
  janasena: 'Janasena (Pawan Kalyan)',
  bjp: 'BJP',
  kutami: 'Kutami (TDP + Janasena + BJP)',
  general: 'General / no specific target',
};

export const DEFAULT_CONFIG: MemeStudioConfig = {
  basePath: '/meme-studio',
  apiBasePath: '/api/meme-studio',
  defaultLanguage: 'te',
  languages: ['en', 'te'],
  defaultTarget: 'kutami',
  // Everything runs on Cursor: captions/ideas as text, and "images" as SVG
  // vector art (stickers/symbols/illustrations/stylized backgrounds). Falls
  // back to OpenAI/Pollinations only if Cursor is unavailable.
  textProvider: 'auto',
  imageProvider: 'cursor',
  cursorModel: DEFAULT_CURSOR_MODEL,
  imageModel: DEFAULT_IMAGE_MODEL,
  theme: 'dark',
  adapters: {},
};

export function createMemeStudioConfig(
  overrides: Partial<MemeStudioConfig> = {},
): MemeStudioConfig {
  return {
    ...DEFAULT_CONFIG,
    ...overrides,
    adapters: { ...DEFAULT_CONFIG.adapters, ...overrides.adapters },
  };
}
