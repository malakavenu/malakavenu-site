/**
 * Language Router — resolves which model/space to use for a given
 * language + panel + optional engine override.
 */

import { LANGUAGES } from '../config';
import type {
  CloneConfig,
  CloneEngineConfig,
  DisabledCloneConfig,
  Engine,
  LanguageCode,
  LanguageEntry,
  NewsReaderConfig,
  PanelId,
} from '../types';

export interface ResolvedModel {
  kind: 'hf-space' | 'browser' | 'disabled';
  space?: string;
  langCode?: string;
  model?: string;
  preprocess?: 'iso15919';
  reason?: string;
}

/**
 * Pick the right model for a given language, panel, and optional engine.
 */
export function pickModel(
  language: LanguageCode,
  panel: PanelId,
  engine?: Engine
): ResolvedModel {
  const entry = LANGUAGES[language];
  if (!entry) {
    return { kind: 'disabled', reason: `Unknown language: ${language}` };
  }

  switch (panel) {
    case 'news-reader':
      return resolveNewsReader(entry.newsReader);

    case 'voice-clone':
      return resolveClone(entry.clone, engine);

    case 'voice-convert':
      // Seed-VC is language-agnostic
      return { kind: 'hf-space', space: 'Plachta/Seed-VC' };

    case 'translate-speak':
      // Translation uses IndicTrans3, then TTS uses the target language's newsReader
      return resolveNewsReader(entry.newsReader);

    default:
      return { kind: 'disabled', reason: `Unknown panel: ${panel}` };
  }
}

function resolveNewsReader(config: NewsReaderConfig): ResolvedModel {
  switch (config.kind) {
    case 'hf-space':
      return { kind: 'hf-space', space: config.space, langCode: config.langCode };
    case 'browser':
      return { kind: 'browser', model: config.model, langCode: config.langCode };
    case 'disabled':
      return { kind: 'disabled', reason: config.reason };
  }
}

function resolveClone(
  clone: CloneConfig | DisabledCloneConfig,
  engine?: Engine
): ResolvedModel {
  // Direct disabled
  if ('kind' in clone && clone.kind === 'disabled') {
    return { kind: 'disabled', reason: (clone as DisabledCloneConfig).reason };
  }

  const cloneConfig = clone as CloneConfig;

  // If user explicitly chose praxy-r6 and experimental is available
  if (engine === 'praxy-r6' && cloneConfig.experimental) {
    return resolveCloneEngine(cloneConfig.experimental);
  }

  // Default engine
  if (cloneConfig.default) {
    if ('kind' in cloneConfig.default && cloneConfig.default.kind === 'disabled') {
      return { kind: 'disabled', reason: (cloneConfig.default as DisabledCloneConfig).reason };
    }
    return resolveCloneEngine(cloneConfig.default as CloneEngineConfig);
  }

  return { kind: 'disabled', reason: 'No clone engine configured' };
}

function resolveCloneEngine(config: CloneEngineConfig): ResolvedModel {
  return {
    kind: 'hf-space',
    space: config.space,
    preprocess: config.preprocess,
  };
}

/**
 * Check if a language supports the experimental engine toggle.
 */
export function hasExperimentalEngine(language: LanguageCode): boolean {
  const entry = LANGUAGES[language];
  if (!entry) return false;
  const clone = entry.clone;
  if ('kind' in clone) return false;
  return !!(clone as CloneConfig).experimental;
}

/**
 * Get available voices for a language.
 */
export function getVoices(language: LanguageCode): string[] {
  return LANGUAGES[language]?.voices ?? [];
}
