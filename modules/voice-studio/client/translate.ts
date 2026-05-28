/**
 * Browser-side translation using MyMemory API (free, no key, CORS-enabled).
 *
 * Fallback: LibreTranslate public mirror.
 * Called directly from the browser — each user's IP gets their own quota.
 * 5000 chars/day anonymous, 50K/day with email param.
 */

import { defaultLogger } from '../adapters/logger';

const MYMEMORY_URL = 'https://api.mymemory.translated.net/get';
const LIBRE_URL = 'https://libretranslate.de/translate';

// Language code mapping: voice-studio internal → MyMemory format
const LANG_MAP: Record<string, string> = {
  'en-IN': 'en', 'en-US': 'en', 'en-GB': 'en',
  'te-IN': 'te', 'hi-IN': 'hi', 'ta-IN': 'ta',
  'bn-IN': 'bn', 'mr-IN': 'mr', 'gu-IN': 'gu',
  'kn-IN': 'kn', 'ml-IN': 'ml', 'pa-IN': 'pa',
  'or-IN': 'or', 'as-IN': 'as', 'ur-IN': 'ur',
  'ne-IN': 'ne', 'sa-IN': 'sa',
  'ja': 'ja', 'zh': 'zh', 'ko': 'ko',
  'es': 'es', 'fr': 'fr', 'pt': 'pt', 'it': 'it',
};

function mapLang(code: string): string {
  return LANG_MAP[code] ?? code.split('-')[0];
}

/**
 * Translate text in the browser using MyMemory (free, CORS).
 */
export async function translateInBrowser(params: {
  text: string;
  sourceLang: string;
  targetLang: string;
}): Promise<string> {
  const { text, sourceLang, targetLang } = params;
  const src = mapLang(sourceLang);
  const tgt = mapLang(targetLang);

  // Chunk text into ≤500 byte segments
  const chunks = chunkText(text, 500);
  const results: string[] = [];

  for (const chunk of chunks) {
    const translated = await translateChunk(chunk, src, tgt);
    results.push(translated);
  }

  return results.join(' ');
}

async function translateChunk(text: string, src: string, tgt: string): Promise<string> {
  // Check sessionStorage cache
  const cacheKey = `vs_tr_${src}_${tgt}_${simpleHash(text)}`;
  if (typeof sessionStorage !== 'undefined') {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) return cached;
  }

  // Try MyMemory first
  try {
    const result = await callMyMemory(text, src, tgt);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(cacheKey, result);
    }
    return result;
  } catch (err) {
    defaultLogger.warn('MyMemory failed, trying LibreTranslate', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Fallback: LibreTranslate
  try {
    const result = await callLibreTranslate(text, src, tgt);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(cacheKey, result);
    }
    return result;
  } catch (err) {
    defaultLogger.error('All translation providers failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    throw new Error('Translation failed — both MyMemory and LibreTranslate unavailable');
  }
}

async function callMyMemory(text: string, src: string, tgt: string): Promise<string> {
  const params = new URLSearchParams({
    q: text,
    langpair: `${src}|${tgt}`,
    de: 'voice-studio@example.com', // bumps to 50K/day
  });

  const res = await fetch(`${MYMEMORY_URL}?${params}`);
  if (!res.ok) throw new Error(`MyMemory HTTP ${res.status}`);

  const data = await res.json();
  if (data.responseStatus !== 200) {
    throw new Error(`MyMemory error: ${data.responseDetails ?? 'unknown'}`);
  }

  return data.responseData?.translatedText ?? '';
}

async function callLibreTranslate(text: string, src: string, tgt: string): Promise<string> {
  const res = await fetch(LIBRE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: text, source: src, target: tgt }),
  });

  if (!res.ok) throw new Error(`LibreTranslate HTTP ${res.status}`);

  const data = await res.json();
  return data.translatedText ?? '';
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function chunkText(text: string, maxBytes: number): string[] {
  const encoder = new TextEncoder();
  const sentences = text.split(/(?<=[.!?।|])\s+/);
  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    const combined = current ? `${current} ${sentence}` : sentence;
    if (encoder.encode(combined).length > maxBytes) {
      if (current) chunks.push(current);
      current = sentence;
    } else {
      current = combined;
    }
  }
  if (current) chunks.push(current);
  return chunks.length > 0 ? chunks : [text];
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}
