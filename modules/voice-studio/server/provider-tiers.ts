/**
 * Provider Tiers — builds the ordered fallback chain for each panel + language.
 *
 * Decision matrix:
 *   narrate:       [indic-parler (if boost)] → edge-tts → kokoro
 *   clone en/west: [indicf5 (if boost)] → openvoice-v2 → f5-browser
 *   clone Indic:   [indicf5 (if boost)] → chatterbox-browser → openvoice-v2
 *   convert:       [seed-vc (if boost)] → openvoice-v2
 *   translate:     [indictrans (if boost)] → mymemory-browser
 */

import type { PanelId, ProviderId, Tier, LanguageCode } from '../types';

export interface ProviderAttempt {
  id: ProviderId;
  tier: Tier;
  /** If true, this provider runs in the browser — handler returns JSON instruction */
  browser: boolean;
}

interface PickOptions {
  useHfBoost: boolean;
  hasHfToken: boolean;
}

/** Indic language codes (includes featured en-IN) */
const INDIC_LANGS = new Set<string>([
  'en-IN', 'te-IN', 'hi-IN', 'ta-IN', 'bn-IN', 'mr-IN', 'gu-IN',
  'kn-IN', 'ml-IN', 'pa-IN', 'or-IN', 'as-IN', 'ur-IN', 'ne-IN',
  'sa-IN', 'kok-IN', 'mai-IN', 'brx-IN', 'doi-IN', 'mni-IN',
  'sat-IN', 'sd-IN', 'mix',
]);

function isIndicLang(language: string): boolean {
  return INDIC_LANGS.has(language);
}

/**
 * Build the ordered provider chain for a given panel + language.
 */
export function pickProviderChain(
  panel: PanelId,
  language: LanguageCode,
  opts: PickOptions
): ProviderAttempt[] {
  const { useHfBoost, hasHfToken } = opts;
  const boostAvailable = useHfBoost && hasHfToken;

  switch (panel) {
    case 'news-reader':
      return buildNarrateChain(language, boostAvailable);
    case 'voice-clone':
      return buildCloneChain(language, boostAvailable);
    case 'voice-convert':
      return buildConvertChain(boostAvailable);
    case 'translate-speak':
      return buildTranslateChain(boostAvailable);
    default:
      return [{ id: 'edge-tts', tier: 'free-server', browser: false }];
  }
}

function buildNarrateChain(language: LanguageCode, boost: boolean): ProviderAttempt[] {
  const chain: ProviderAttempt[] = [];

  if (boost && isIndicLang(language)) {
    chain.push({ id: 'indic-parler', tier: 'hf-boost', browser: false });
  }

  chain.push({ id: 'edge-tts', tier: 'free-server', browser: false });
  chain.push({ id: 'kokoro', tier: 'browser', browser: true });

  return chain;
}

function buildCloneChain(language: LanguageCode, boost: boolean): ProviderAttempt[] {
  const chain: ProviderAttempt[] = [];

  // Voice cloning requires GPU on the server — only available via HF Boost
  if (boost) {
    chain.push({ id: 'indicf5', tier: 'hf-boost', browser: false });
  }

  // Free server option (OpenVoice V2 on CPU-basic) — works for en-* but quality on
  // Indic native script is mediocre, so we route to browser Chatterbox for Indic.
  if (!isIndicLang(language) || language === 'en-IN' || language === 'en-US') {
    chain.push({ id: 'openvoice-v2', tier: 'free-server', browser: false });
  }

  // Browser fallback. F5-TTS is lighter (~200 MB) and English-only; Chatterbox is
  // the multilingual heavyweight (~1.5 GB) and is the only browser option for Indic.
  if (language === 'en-US' || language === 'en-GB' || language === 'en-IN') {
    chain.push({ id: 'f5-browser', tier: 'browser', browser: true });
  }
  chain.push({ id: 'chatterbox-browser', tier: 'browser', browser: true });

  return chain;
}

function buildConvertChain(boost: boolean): ProviderAttempt[] {
  const chain: ProviderAttempt[] = [];

  if (boost) {
    chain.push({ id: 'seed-vc', tier: 'hf-boost', browser: false });
  }

  // OpenVoice V2 does both clone and conversion on CPU-basic
  chain.push({ id: 'openvoice-v2', tier: 'free-server', browser: false });
  chain.push({ id: 'chatterbox-browser', tier: 'browser', browser: true });

  return chain;
}

function buildTranslateChain(boost: boolean): ProviderAttempt[] {
  const chain: ProviderAttempt[] = [];

  if (boost) {
    chain.push({ id: 'indictrans', tier: 'hf-boost', browser: false });
  }

  chain.push({ id: 'mymemory-browser', tier: 'browser', browser: true });

  return chain;
}
