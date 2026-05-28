/**
 * Server-side route handlers for Voice Studio.
 *
 * Each handler:
 * 1. Reads `x-vs-hf-boost` header to determine if HF Boost is enabled
 * 2. Calls pickProviderChain() to get the ordered fallback chain
 * 3. For server-side providers, runs fallbackChain()
 * 4. For browser-side providers, returns JSON { mode: 'browser', provider }
 * 5. Sets X-VS-Provider-Used response header
 */

import { NextRequest, NextResponse } from 'next/server';
import { LANGUAGES } from '../config';
import type {
  Engine,
  LanguageCode,
  ProviderId,
  Tone,
} from '../types';
import { defaultEnv } from '../adapters/env';
import { defaultLogger } from '../adapters/logger';
import {
  callIndicF5,
  callIndicParlerTts,
  callIndicTrans,
  callPraxyR6,
  callSeedVc,
} from './hf-spaces';
import { callOpenVoiceClone, callOpenVoiceConvert } from './openvoice';
import { romanise, romaniseCodeMix } from './iso15919';
import { pickProviderChain } from './provider-tiers';
import { fallbackChain, ProviderAttempt as FallbackAttempt } from './providers';
import { splitIntoChunks, processChunksParallel } from './chunker';
import { callEdgeTts } from './edge-tts';

// ─── Helpers ────────────────────────────────────────────────────────────────

function readBoostHeader(request: NextRequest): boolean {
  return request.headers.get('x-vs-hf-boost') === '1';
}

function makeResponse(buffer: ArrayBuffer, contentType: string, provider: string): NextResponse {
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': contentType,
      'X-VS-Provider-Used': provider,
    },
  });
}

function makeBrowserResponse(provider: ProviderId, extra?: Record<string, unknown>): NextResponse {
  return NextResponse.json(
    { mode: 'browser', provider, ...extra },
    { headers: { 'X-VS-Provider-Used': provider } }
  );
}

// ─── Narrate Handler ────────────────────────────────────────────────────────

export async function handleNarrate(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const text = formData.get('text') as string;
    const language = formData.get('language') as LanguageCode;
    const voice = (formData.get('voice') as string) ?? undefined;
    const tone = (formData.get('tone') as Tone) ?? undefined;

    if (!text || !language) {
      return NextResponse.json(
        { error: 'Missing required fields: text, language' },
        { status: 400 }
      );
    }

    const useHfBoost = readBoostHeader(request);
    const hfToken = defaultEnv.HF_TOKEN;
    const chain = pickProviderChain('news-reader', language, {
      useHfBoost,
      hasHfToken: !!hfToken,
    });

    // Find first browser-only provider (if all server providers are absent)
    const serverProviders = chain.filter((p) => !p.browser);
    const browserFallback = chain.find((p) => p.browser);

    if (serverProviders.length === 0 && browserFallback) {
      return makeBrowserResponse(browserFallback.id);
    }

    // Build fallback attempts for server providers
    const chunks = splitIntoChunks(text);
    let usedProvider: ProviderId = serverProviders[0]?.id ?? 'edge-tts';

    const audioBlobs = await processChunksParallel(
      chunks,
      async (chunk) => {
        // Track which provider actually returns the audio for this chunk by
        // wrapping each attempt's fn. The last-success wins for multi-chunk
        // (since the chunker runs serially with concurrency=1).
        const attempts: FallbackAttempt<Blob>[] = serverProviders.map((p) => ({
          name: p.id,
          timeoutMs: p.id === 'edge-tts' ? 15_000 : 45_000,
          fn: async () => {
            const blob = await runNarrateProvider(p.id, chunk, language, voice, tone, hfToken);
            usedProvider = p.id;
            return blob;
          },
        }));
        return fallbackChain(attempts);
      },
      1 // serial to avoid hammering rate-limited providers
    );

    const combined = new Blob(audioBlobs, { type: 'audio/mpeg' });
    const buffer = await combined.arrayBuffer();

    return makeResponse(buffer, 'audio/mpeg', usedProvider);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    defaultLogger.error('Narrate handler failed', { error: errorMsg });

    if (errorMsg.includes('quota') || errorMsg.includes('ZeroGPU') || errorMsg.includes('QuotaExhausted')) {
      return NextResponse.json(
        {
          error: 'GPU quota exhausted. Using browser fallback.',
          code: 'QUOTA_EXHAUSTED',
          fallback: 'browser-tts',
        },
        { status: 429 }
      );
    }

    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

async function runNarrateProvider(
  id: ProviderId,
  text: string,
  language: LanguageCode,
  voice?: string,
  tone?: string,
  hfToken?: string
): Promise<Blob> {
  switch (id) {
    case 'indic-parler': {
      const langEntry = LANGUAGES[language];
      const langCode =
        langEntry?.newsReader?.kind === 'hf-space'
          ? (langEntry.newsReader as { langCode?: string }).langCode ?? 'en'
          : 'en';
      return callIndicParlerTts({ text, langCode, voice, tone, hfToken });
    }
    case 'edge-tts': {
      const buffer = await callEdgeTts({ text, language, voice, tone });
      return new Blob([new Uint8Array(buffer)], { type: 'audio/mpeg' });
    }
    default:
      throw new Error(`Unsupported narrate provider: ${id}`);
  }
}

// ─── Clone Handler ──────────────────────────────────────────────────────────

export async function handleClone(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const text = formData.get('text') as string;
    const language = formData.get('language') as LanguageCode;
    const referenceAudio = formData.get('referenceAudio') as Blob;
    const referenceTranscript = formData.get('referenceTranscript') as string;
    const engine = (formData.get('engine') as Engine) ?? undefined;

    if (!text || !language || !referenceAudio || !referenceTranscript) {
      return NextResponse.json(
        { error: 'Missing required fields: text, language, referenceAudio, referenceTranscript' },
        { status: 400 }
      );
    }

    const useHfBoost = readBoostHeader(request);
    const hfToken = defaultEnv.HF_TOKEN;
    const chain = pickProviderChain('voice-clone', language, {
      useHfBoost,
      hasHfToken: !!hfToken,
    });

    // Try server providers first, return browser instruction if only browser left
    for (const provider of chain) {
      if (provider.browser) {
        return makeBrowserResponse(provider.id);
      }

      try {
        const audioBlob = await runCloneProvider(
          provider.id,
          text,
          language,
          referenceAudio,
          referenceTranscript,
          engine,
          hfToken
        );

        // Return the blob directly (no watermark — passthrough)
        const buffer = await audioBlob.arrayBuffer();
        return makeResponse(buffer, 'audio/wav', provider.id);
      } catch (err) {
        defaultLogger.warn(`Clone provider ${provider.id} failed, trying next`, {
          error: err instanceof Error ? err.message : String(err),
        });
        continue;
      }
    }

    return NextResponse.json(
      { error: 'All clone providers failed' },
      { status: 500 }
    );
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    defaultLogger.error('Clone handler failed', { error: errorMsg });

    if (errorMsg.includes('quota') || errorMsg.includes('ZeroGPU') || errorMsg.includes('QuotaExhausted')) {
      return NextResponse.json(
        { error: 'GPU quota exhausted for today.', code: 'QUOTA_EXHAUSTED' },
        { status: 429 }
      );
    }

    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

async function runCloneProvider(
  id: ProviderId,
  text: string,
  language: LanguageCode,
  referenceAudio: Blob,
  referenceTranscript: string,
  engine?: Engine,
  hfToken?: string
): Promise<Blob> {
  switch (id) {
    case 'indicf5': {
      // Handle romanisation for code-mix or praxy
      if (engine === 'praxy-r6') {
        const romanisedText = romanise(text, language === 'te-IN' ? 'te' : 'ta');
        const romanisedTranscript = romanise(referenceTranscript, language === 'te-IN' ? 'te' : 'ta');
        return callPraxyR6({ text: romanisedText, referenceAudio, referenceTranscript: romanisedTranscript, hfToken });
      }
      if (language === 'mix') {
        const processedText = romaniseCodeMix(text);
        const processedTranscript = romaniseCodeMix(referenceTranscript);
        return callIndicF5({ text: processedText, referenceAudio, referenceTranscript: processedTranscript, hfToken });
      }
      return callIndicF5({ text, referenceAudio, referenceTranscript, hfToken });
    }
    case 'openvoice-v2': {
      return callOpenVoiceClone({ text, refAudio: referenceAudio, language, hfToken });
    }
    default:
      throw new Error(`Unsupported clone provider: ${id}`);
  }
}

// ─── Convert Handler ────────────────────────────────────────────────────────

export async function handleConvert(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const sourceAudio = formData.get('sourceAudio') as Blob;
    const referenceAudio = formData.get('referenceAudio') as Blob;

    if (!sourceAudio || !referenceAudio) {
      return NextResponse.json(
        { error: 'Missing required fields: sourceAudio, referenceAudio' },
        { status: 400 }
      );
    }

    const useHfBoost = readBoostHeader(request);
    const hfToken = defaultEnv.HF_TOKEN;
    const chain = pickProviderChain('voice-convert', 'en-IN', {
      useHfBoost,
      hasHfToken: !!hfToken,
    });

    for (const provider of chain) {
      if (provider.browser) {
        return makeBrowserResponse(provider.id);
      }

      try {
        const audioBlob = await runConvertProvider(provider.id, sourceAudio, referenceAudio, hfToken);
        const buffer = await audioBlob.arrayBuffer();
        return makeResponse(buffer, 'audio/wav', provider.id);
      } catch (err) {
        defaultLogger.warn(`Convert provider ${provider.id} failed, trying next`, {
          error: err instanceof Error ? err.message : String(err),
        });
        continue;
      }
    }

    return NextResponse.json(
      { error: 'All convert providers failed' },
      { status: 500 }
    );
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    defaultLogger.error('Convert handler failed', { error: errorMsg });

    if (errorMsg.includes('quota') || errorMsg.includes('ZeroGPU') || errorMsg.includes('QuotaExhausted')) {
      return NextResponse.json(
        { error: 'GPU quota exhausted for today.', code: 'QUOTA_EXHAUSTED' },
        { status: 429 }
      );
    }

    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

async function runConvertProvider(
  id: ProviderId,
  sourceAudio: Blob,
  referenceAudio: Blob,
  hfToken?: string
): Promise<Blob> {
  switch (id) {
    case 'seed-vc':
      return callSeedVc({ sourceAudio, referenceAudio, hfToken });
    case 'openvoice-v2':
      return callOpenVoiceConvert({ sourceAudio, refAudio: referenceAudio, hfToken });
    default:
      throw new Error(`Unsupported convert provider: ${id}`);
  }
}

// ─── Translate Handler ──────────────────────────────────────────────────────

export async function handleTranslate(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const text = formData.get('text') as string;
    const sourceLang = formData.get('sourceLang') as LanguageCode;
    const targetLang = formData.get('targetLang') as LanguageCode;
    const voice = (formData.get('voice') as string) ?? undefined;
    const tone = (formData.get('tone') as Tone) ?? undefined;

    if (!text || !sourceLang || !targetLang) {
      return NextResponse.json(
        { error: 'Missing required fields: text, sourceLang, targetLang' },
        { status: 400 }
      );
    }

    const useHfBoost = readBoostHeader(request);
    const hfToken = defaultEnv.HF_TOKEN;
    const chain = pickProviderChain('translate-speak', targetLang, {
      useHfBoost,
      hasHfToken: !!hfToken,
    });

    // Try translation providers
    for (const provider of chain) {
      if (provider.browser) {
        // Browser-side translation (MyMemory) — return instruction
        return makeBrowserResponse(provider.id, { sourceLang, targetLang, text });
      }

      try {
        const translatedText = await runTranslateProvider(
          provider.id, text, sourceLang, targetLang, hfToken
        );

        // Now narrate the translated text using the narrate chain for target language
        const narrateChain = pickProviderChain('news-reader', targetLang, {
          useHfBoost,
          hasHfToken: !!hfToken,
        });

        const serverNarrate = narrateChain.filter((p) => !p.browser);
        if (serverNarrate.length === 0) {
          // Return just the translation — client handles TTS
          return NextResponse.json(
            { translatedText, ttsMode: 'browser' },
            { headers: { 'X-VS-Provider-Used': provider.id } }
          );
        }

        // Try to narrate server-side
        try {
          const attempts: FallbackAttempt<Blob>[] = serverNarrate.map((p) => ({
            name: p.id,
            timeoutMs: p.id === 'edge-tts' ? 15_000 : 45_000,
            fn: () => runNarrateProvider(p.id, translatedText, targetLang, voice, tone, hfToken),
          }));

          const audioBlob = await fallbackChain(attempts);
          const buffer = await audioBlob.arrayBuffer();

          return new NextResponse(buffer, {
            headers: {
              'Content-Type': 'audio/mpeg',
              'X-VS-Provider-Used': provider.id,
              'X-Translated-Text': encodeURIComponent(translatedText),
            },
          });
        } catch {
          // Narration failed — return text only
          return NextResponse.json(
            { translatedText, ttsMode: 'browser' },
            { headers: { 'X-VS-Provider-Used': provider.id } }
          );
        }
      } catch (err) {
        defaultLogger.warn(`Translate provider ${provider.id} failed, trying next`, {
          error: err instanceof Error ? err.message : String(err),
        });
        continue;
      }
    }

    return NextResponse.json(
      { error: 'All translation providers failed' },
      { status: 500 }
    );
  } catch (err) {
    defaultLogger.error('Translate handler failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

async function runTranslateProvider(
  id: ProviderId,
  text: string,
  sourceLang: LanguageCode,
  targetLang: LanguageCode,
  hfToken?: string
): Promise<string> {
  switch (id) {
    case 'indictrans': {
      const sourceLangEntry = LANGUAGES[sourceLang];
      const targetLangEntry = LANGUAGES[targetLang];
      const srcCode =
        sourceLangEntry?.newsReader?.kind === 'hf-space'
          ? (sourceLangEntry.newsReader as { langCode?: string }).langCode ?? sourceLang
          : sourceLang;
      const tgtCode =
        targetLangEntry?.newsReader?.kind === 'hf-space'
          ? (targetLangEntry.newsReader as { langCode?: string }).langCode ?? targetLang
          : targetLang;
      return callIndicTrans({ text, sourceLang: srcCode, targetLang: tgtCode, hfToken });
    }
    default:
      throw new Error(`Unsupported translate provider: ${id}`);
  }
}
