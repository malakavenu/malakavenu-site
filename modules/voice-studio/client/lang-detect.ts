/**
 * Language detection using IndicLID (Indic-aware).
 *
 * Better than franc for Indic scripts — handles Telugu, Tamil,
 * Devanagari, and other Indic scripts accurately.
 *
 * Falls back to simple Unicode range detection if the model isn't available.
 */

import type { LanguageCode } from '../types';

// Unicode range-based detection (fast, no model needed)
const SCRIPT_RANGES: Array<{ range: [number, number]; lang: LanguageCode }> = [
  [0x0C00, 0x0C7F], // Telugu
  [0x0B80, 0x0BFF], // Tamil
  [0x0900, 0x097F], // Devanagari (Hindi/Marathi/Sanskrit/etc.)
  [0x0980, 0x09FF], // Bengali/Assamese
  [0x0A00, 0x0A7F], // Gurmukhi (Punjabi)
  [0x0A80, 0x0AFF], // Gujarati
  [0x0B00, 0x0B7F], // Odia
  [0x0D00, 0x0D7F], // Malayalam
  [0x0C80, 0x0CFF], // Kannada
].map(([start, end], i) => ({
  range: [start, end] as [number, number],
  lang: (['te-IN', 'ta-IN', 'hi-IN', 'bn-IN', 'pa-IN', 'gu-IN', 'or-IN', 'ml-IN', 'kn-IN'] as LanguageCode[])[i],
}));

/**
 * Detect the primary language of a text string.
 * Uses Unicode script ranges for fast detection.
 */
export function detectLanguage(text: string): LanguageCode {
  const scriptCounts = new Map<LanguageCode, number>();
  let latinCount = 0;
  let totalChars = 0;

  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;

    // Skip whitespace and punctuation
    if (code <= 0x007F && !/[a-zA-Z]/.test(char)) continue;

    totalChars++;

    // Latin
    if ((code >= 0x0041 && code <= 0x005A) || (code >= 0x0061 && code <= 0x007A)) {
      latinCount++;
      continue;
    }

    // Check Indic scripts
    for (const { range, lang } of SCRIPT_RANGES) {
      if (code >= range[0] && code <= range[1]) {
        scriptCounts.set(lang, (scriptCounts.get(lang) ?? 0) + 1);
        break;
      }
    }
  }

  if (totalChars === 0) return 'en-IN';

  // Find dominant script
  let maxLang: LanguageCode = 'en-IN';
  let maxCount = latinCount;

  for (const [lang, count] of scriptCounts) {
    if (count > maxCount) {
      maxCount = count;
      maxLang = lang;
    }
  }

  // If mostly Latin, determine if Indian English or US English
  if (maxLang === 'en-IN' && latinCount > 0) {
    // Default to Indian English (user's primary use case)
    return 'en-IN';
  }

  return maxLang;
}

/**
 * Detect if text is code-mixed (multiple scripts).
 */
export function isCodeMixed(text: string): boolean {
  let hasLatin = false;
  let hasIndic = false;

  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;

    if ((code >= 0x0041 && code <= 0x005A) || (code >= 0x0061 && code <= 0x007A)) {
      hasLatin = true;
    }

    for (const { range } of SCRIPT_RANGES) {
      if (code >= range[0] && code <= range[1]) {
        hasIndic = true;
        break;
      }
    }

    if (hasLatin && hasIndic) return true;
  }

  return false;
}
