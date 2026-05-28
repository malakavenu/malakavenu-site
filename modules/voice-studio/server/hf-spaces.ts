/**
 * HF Boost layer — only invoked when useHfBoost=true.
 *
 * Gradio Client wrappers for all HF Spaces used by Voice Studio.
 *
 * Spaces:
 * - ai4bharat/indic-parler-tts  (Indic newsreader TTS)
 * - ai4bharat/IndicF5           (Indic voice cloning)
 * - Praxel/praxy-voice-r6       (Telugu/Tamil cloning A/B)
 * - Plachta/Seed-VC             (Voice conversion)
 * - ai4bharat/IndicTrans3-beta  (Indic translation)
 */

import { Client } from '@gradio/client';
import { defaultLogger } from '../adapters/logger';

// ─── Quota Error ────────────────────────────────────────────────────────────

/**
 * Thrown when a ZeroGPU-backed space exhausts its quota.
 * Signals the fallback chain to move to the next provider.
 */
export class QuotaExhaustedError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'QuotaExhaustedError';
  }
}

/** Detect quota-related error patterns from HF ZeroGPU spaces */
function isQuotaError(msg: unknown): boolean {
  if (msg === null || msg === undefined) return true; // "failed: null" pattern
  const s = String(msg).toLowerCase();
  return (
    s.includes('quota') ||
    s.includes('zerogpu') ||
    s.includes('429') ||
    s.includes('failed: null')
  );
}

// ─── Retry Utilities ────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isTransientError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes('503') ||
    msg.includes('502') ||
    msg.includes('service unavailable') ||
    msg.includes('connection refused') ||
    msg.includes('econnrefused') ||
    msg.includes('fetch failed') ||
    msg.includes('queue join failed: 5') ||
    msg.includes('sse connection failed: 5') ||
    msg.includes('network error') ||
    msg.includes('timed out')
  );
}

/**
 * Retry a function up to `maxAttempts` times on transient 503/network errors.
 * Uses linear back-off: attempt 1 → baseDelayMs, attempt 2 → 2×, attempt 3 → 3×…
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  {
    maxAttempts = 3,
    baseDelayMs = 4000,
    label = 'operation',
  }: { maxAttempts?: number; baseDelayMs?: number; label?: string } = {}
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isTransientError(err) || attempt === maxAttempts) throw err;
      const delay = baseDelayMs * attempt;
      defaultLogger.warn(
        `${label}: transient error on attempt ${attempt}/${maxAttempts}, retrying in ${delay}ms`,
        { error: err instanceof Error ? err.message : String(err) }
      );
      await sleep(delay);
    }
  }
  throw lastErr;
}

// ─── Connection Pool ────────────────────────────────────────────────────────

const clientCache = new Map<string, Promise<Client>>();

export async function getClient(space: string, hfToken?: string): Promise<Client> {
  const key = `${space}:${hfToken ?? 'anon'}`;
  if (!clientCache.has(key)) {
    const options: Record<string, unknown> = {};
    if (hfToken) options.hf_token = hfToken;
    const promise = Client.connect(space, options as Parameters<typeof Client.connect>[1]).catch((err) => {
      clientCache.delete(key);
      throw err;
    });
    clientCache.set(key, promise);
  }
  return clientCache.get(key)!;
}

/** Warm up a space by pinging it (non-blocking). */
export function warmUpSpace(space: string, hfToken?: string): void {
  // Just ping the root URL to wake it up — don't use @gradio/client
  // since some spaces have broken /gradio_api/info endpoints
  const baseUrl = `https://${space.replace('/', '-').toLowerCase()}.hf.space`;
  fetch(baseUrl, { method: 'HEAD' }).catch((err) => {
    defaultLogger.warn(`Warm-up failed for ${space}`, { error: String(err) });
  });
}

// ─── Indic Parler-TTS ───────────────────────────────────────────────────────

export interface ParlerTtsParams {
  text: string;
  langCode: string;
  voice?: string;
  tone?: string;
  hfToken?: string;
}

/**
 * Call Indic Parler-TTS.
 *
 * The space's /gradio_api/info endpoint is broken (gradio_client bug),
 * so @gradio/client can't connect. We call the queue API directly.
 *
 * Space takes 2 inputs: [text, description]
 * Working fn_index: 1 (finetuned model)
 */
export async function callIndicParlerTts(params: ParlerTtsParams): Promise<Blob> {
  return withRetry(() => _callIndicParlerTts(params), {
    maxAttempts: 3,
    baseDelayMs: 5000,
    label: 'callIndicParlerTts',
  });
}

async function _callIndicParlerTts(params: ParlerTtsParams): Promise<Blob> {
  const { text, voice, tone, hfToken } = params;
  const description = buildParlerDescription(voice, tone);

  const spaceUrl = 'https://ai4bharat-indic-parler-tts.hf.space';
  const sessionHash = `vs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // Build headers — include HF token for ZeroGPU quota
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (hfToken) headers['Authorization'] = `Bearer ${hfToken}`;

  // Step 1: Join queue
  const joinRes = await fetch(`${spaceUrl}/gradio_api/queue/join`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      data: [text, description],
      fn_index: 1, // generate_finetuned
      session_hash: sessionHash,
    }),
  });

  if (!joinRes.ok) {
    if (joinRes.status === 429) {
      throw new QuotaExhaustedError(`Parler-TTS quota exhausted (429)`);
    }
    throw new Error(`Parler-TTS queue join failed: ${joinRes.status}`);
  }

  const { event_id } = await joinRes.json();
  defaultLogger.info(`Parler-TTS queued: ${event_id}`);

  // Step 2: Poll SSE for result (also needs auth for ZeroGPU)
  const sseHeaders: Record<string, string> = {};
  if (hfToken) sseHeaders['Authorization'] = `Bearer ${hfToken}`;

  const sseRes = await fetch(`${spaceUrl}/gradio_api/queue/data?session_hash=${sessionHash}`, {
    headers: sseHeaders,
  });
  if (!sseRes.ok || !sseRes.body) {
    throw new Error(`Parler-TTS SSE connection failed: ${sseRes.status}`);
  }

  const reader = sseRes.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Parse SSE events
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      try {
        const event = JSON.parse(line.slice(5));
        if (event.msg === 'process_completed') {
          if (!event.success) {
            const errMsg = event.output?.error ?? 'Unknown error';
            if (isQuotaError(errMsg) || errMsg === null) {
              throw new QuotaExhaustedError(`Parler-TTS quota exhausted: ${errMsg}`);
            }
            throw new Error(`Parler-TTS failed: ${errMsg}`);
          }
          const outputData = event.output?.data?.[0];
          if (outputData?.url) {
            // Fetch the audio file from the space
            const audioRes = await fetch(outputData.url);
            if (!audioRes.ok) throw new Error(`Failed to fetch audio: ${audioRes.status}`);
            return await audioRes.blob();
          }
          throw new Error('No audio URL in Parler-TTS response');
        }
      } catch (e) {
        if (e instanceof SyntaxError) continue; // Partial JSON, skip
        throw e;
      }
    }
  }

  throw new Error('Parler-TTS SSE stream ended without result');
}

function buildParlerDescription(voice?: string, tone?: string): string {
  const parts: string[] = [];
  if (voice) parts.push(`${voice} speaks`);
  else parts.push('The speaker speaks');
  if (tone === 'warm') parts.push('warmly in a moderate-pitched voice');
  else if (tone === 'calm') parts.push('slowly in a calm, low-pitched voice');
  else if (tone === 'energetic') parts.push('quickly in a high-pitched, energetic voice');
  else if (tone === 'authoritative') parts.push('slowly in a low-pitched, authoritative voice');
  else if (tone === 'conversational') parts.push('at a moderate pace in a conversational tone');
  else parts.push('naturally with a clear voice');
  parts.push('. The recording is very high quality with no background noise.');
  return parts.join('');
}

// ─── IndicF5 Voice Cloning ──────────────────────────────────────────────────

export interface IndicF5Params {
  text: string;
  referenceAudio: Blob;
  referenceTranscript: string;
  hfToken?: string;
}

/**
 * Call IndicF5 for voice cloning via direct queue API.
 *
 * Uses Asswin04310/IndicF5 (community fork with ungated model).
 * Interface: synthesize_speech(text, ref_audio, ref_text)
 */
export async function callIndicF5(params: IndicF5Params): Promise<Blob> {
  const { text, referenceAudio, referenceTranscript, hfToken } = params;

  const spaceUrl = 'https://asswin04310-indicf5.hf.space';
  const sessionHash = `f5_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (hfToken) headers['Authorization'] = `Bearer ${hfToken}`;

  // Upload reference audio
  const refPath = await uploadToSpace(spaceUrl, referenceAudio, 'ref_audio.wav', hfToken);

  // Queue the synthesis
  const joinRes = await fetch(`${spaceUrl}/gradio_api/queue/join`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      data: [
        text,
        { path: refPath, orig_name: 'ref_audio.wav', size: referenceAudio.size, mime_type: 'audio/wav' },
        referenceTranscript,
      ],
      fn_index: 0,
      session_hash: sessionHash,
    }),
  });

  if (!joinRes.ok) {
    if (joinRes.status === 429) {
      throw new QuotaExhaustedError(`IndicF5 quota exhausted (429)`);
    }
    throw new Error(`IndicF5 queue join failed: ${joinRes.status}`);
  }
  const { event_id } = await joinRes.json();
  defaultLogger.info(`IndicF5 queued: ${event_id}`);

  // Poll SSE
  const sseHeaders: Record<string, string> = {};
  if (hfToken) sseHeaders['Authorization'] = `Bearer ${hfToken}`;

  const sseRes = await fetch(`${spaceUrl}/gradio_api/queue/data?session_hash=${sessionHash}`, { headers: sseHeaders });
  if (!sseRes.ok || !sseRes.body) throw new Error(`IndicF5 SSE failed: ${sseRes.status}`);

  const reader = sseRes.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      try {
        const event = JSON.parse(line.slice(5));
        if (event.msg === 'process_completed') {
          if (!event.success) {
            const errMsg = event.output?.error ?? 'IndicF5 generation failed (likely ZeroGPU quota exhausted)';
            if (isQuotaError(errMsg) || errMsg === null) {
              throw new QuotaExhaustedError(`IndicF5 quota exhausted: ${errMsg}`);
            }
            throw new Error(`IndicF5 failed: ${errMsg}`);
          }
          // Output is (sample_rate, audio_array) tuple — returned as a file
          const outputData = event.output?.data?.[0];
          if (outputData?.url) {
            const audioRes = await fetch(outputData.url);
            if (!audioRes.ok) throw new Error(`Failed to fetch IndicF5 audio: ${audioRes.status}`);
            return await audioRes.blob();
          }
          // Some Gradio versions return the audio inline as base64 or path
          if (outputData?.path) {
            const audioRes = await fetch(`${spaceUrl}/gradio_api/file=${outputData.path}`);
            if (!audioRes.ok) throw new Error(`Failed to fetch IndicF5 audio from path`);
            return await audioRes.blob();
          }
          throw new Error('No audio in IndicF5 response');
        }
      } catch (e) {
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }

  throw new Error('IndicF5 SSE stream ended without result');
}

// ─── Praxy Voice R6 (Telugu/Tamil experimental) ─────────────────────────────

export interface PraxyR6Params {
  text: string; // Must be ISO-15919 romanised
  referenceAudio: Blob;
  referenceTranscript: string; // Also romanised
  hfToken?: string;
}

export async function callPraxyR6(params: PraxyR6Params): Promise<Blob> {
  const { text, referenceAudio, referenceTranscript, hfToken } = params;
  const client = await getClient('Praxel/praxy-voice-r6', hfToken);

  const result = await client.predict('/generate', {
    text,
    audio: referenceAudio,
    transcript: referenceTranscript,
    language_id: 'hi', // Hindi proxy per Praxy recipe
    exaggeration: 0.7,
    temperature: 0.6,
    min_p: 0.1,
  });

  return extractAudioBlob(result);
}

// ─── Seed-VC (Voice Conversion) ─────────────────────────────────────────────

export interface SeedVcParams {
  sourceAudio: Blob;
  referenceAudio: Blob;
  hfToken?: string;
}

export async function callSeedVc(params: SeedVcParams): Promise<Blob> {
  const { sourceAudio, referenceAudio, hfToken } = params;

  const spaceUrl = 'https://plachta-seed-vc.hf.space';
  const sessionHash = `vc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (hfToken) headers['Authorization'] = `Bearer ${hfToken}`;

  // Upload source audio
  const sourcePath = await uploadToSpace(spaceUrl, sourceAudio, 'source.wav', hfToken);
  // Upload reference audio
  const refPath = await uploadToSpace(spaceUrl, referenceAudio, 'reference.wav', hfToken);

  // Queue the conversion
  const joinRes = await fetch(`${spaceUrl}/gradio_api/queue/join`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      data: [
        { path: sourcePath, orig_name: 'source.wav', size: sourceAudio.size, mime_type: 'audio/wav' },
        { path: refPath, orig_name: 'reference.wav', size: referenceAudio.size, mime_type: 'audio/wav' },
        25, // diffusion steps
        1.0, // length adjust
        0.7, // inference cfg rate
        10, // n quantizers
        3.0, // f0 condition
      ],
      fn_index: 0,
      session_hash: sessionHash,
    }),
  });

  if (!joinRes.ok) {
    if (joinRes.status === 429) {
      throw new QuotaExhaustedError(`Seed-VC quota exhausted (429)`);
    }
    throw new Error(`Seed-VC queue join failed: ${joinRes.status}`);
  }
  const { event_id } = await joinRes.json();
  defaultLogger.info(`Seed-VC queued: ${event_id}`);

  // Poll SSE
  const sseHeaders: Record<string, string> = {};
  if (hfToken) sseHeaders['Authorization'] = `Bearer ${hfToken}`;

  const sseRes = await fetch(`${spaceUrl}/gradio_api/queue/data?session_hash=${sessionHash}`, { headers: sseHeaders });
  if (!sseRes.ok || !sseRes.body) throw new Error(`Seed-VC SSE failed: ${sseRes.status}`);

  const reader = sseRes.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      try {
        const event = JSON.parse(line.slice(5));
        if (event.msg === 'process_completed') {
          if (!event.success) {
            const errMsg = event.output?.error ?? 'Seed-VC generation failed (likely ZeroGPU quota exhausted)';
            if (isQuotaError(errMsg) || errMsg === null) {
              throw new QuotaExhaustedError(`Seed-VC quota exhausted: ${errMsg}`);
            }
            throw new Error(`Seed-VC failed: ${errMsg}`);
          }
          const outputData = event.output?.data?.[0];
          if (outputData?.url) {
            const audioRes = await fetch(outputData.url);
            if (!audioRes.ok) throw new Error(`Failed to fetch Seed-VC audio: ${audioRes.status}`);
            return await audioRes.blob();
          }
          throw new Error('No audio URL in Seed-VC response');
        }
      } catch (e) {
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }

  throw new Error('Seed-VC SSE stream ended without result');
}

/** Upload a blob to a Gradio space's upload endpoint */
async function uploadToSpace(spaceUrl: string, blob: Blob, filename: string, hfToken?: string): Promise<string> {
  const formData = new FormData();
  formData.append('files', blob, filename);

  const headers: Record<string, string> = {};
  if (hfToken) headers['Authorization'] = `Bearer ${hfToken}`;

  const res = await fetch(`${spaceUrl}/gradio_api/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!res.ok) throw new Error(`Upload to ${spaceUrl} failed: ${res.status}`);
  const paths = await res.json();
  return paths[0];
}

// ─── IndicTrans (Translation) ────────────────────────────────────────────────

export interface IndicTransParams {
  text: string;
  sourceLang: string;
  targetLang: string;
  hfToken?: string;
}

/**
 * Translate text using IndicTrans.
 *
 * Fallback chain:
 * 1. ai4bharat/IndicTrans3-beta space
 * 2. ai4bharat/indictrans2 space
 * 3. HF Inference API with indictrans2-en-indic-1B model (requires token)
 */
export async function callIndicTrans(params: IndicTransParams): Promise<string> {
  const { text, sourceLang, targetLang, hfToken } = params;

  // Try Gradio spaces first
  const spacesToTry = [
    'ai4bharat/IndicTrans3-beta',
    'ai4bharat/indictrans2',
  ];

  for (const space of spacesToTry) {
    try {
      const result = await withRetry(
        async () => {
          const client = await getClient(space, hfToken);
          return client.predict('/translate', {
            text,
            source_language: sourceLang,
            target_language: targetLang,
          });
        },
        { maxAttempts: 2, baseDelayMs: 5000, label: `IndicTrans/${space}` }
      );

      if (result && typeof result.data === 'object' && Array.isArray(result.data)) {
        return String(result.data[0] ?? '');
      }
      return String(result?.data ?? '');
    } catch (err) {
      defaultLogger.warn(`Translation space ${space} failed, trying next…`, {
        error: err instanceof Error ? err.message : String(err),
      });
      clientCache.delete(`${space}:${hfToken ?? 'anon'}`);
    }
  }

  // Fallback: HF Inference API (requires token)
  if (hfToken) {
    try {
      return await callIndicTransViaInference(text, sourceLang, targetLang, hfToken);
    } catch (err) {
      defaultLogger.warn('HF Inference API translation failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  throw new Error(
    'Translation services unavailable. Both IndicTrans3-beta and IndicTrans2 spaces are down. Try again later.'
  );
}

/**
 * Fallback: call IndicTrans2 via HF Inference API.
 * Requires HF_TOKEN with model access.
 */
async function callIndicTransViaInference(
  text: string,
  sourceLang: string,
  targetLang: string,
  hfToken: string
): Promise<string> {
  // IndicTrans2 expects a specific input format
  const inputText = `${sourceLang} ${targetLang} ${text}`;

  const response = await fetch(
    'https://router.huggingface.co/hf-inference/models/ai4bharat/indictrans2-en-indic-1B',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hfToken}`,
      },
      body: JSON.stringify({
        inputs: inputText,
        parameters: { max_new_tokens: 256 },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`HF Inference API returned ${response.status}`);
  }

  const data = await response.json();

  // Response shape: [{ generated_text: string }] or { generated_text: string }
  if (Array.isArray(data) && data[0]?.generated_text) {
    return data[0].generated_text;
  }
  if (data?.generated_text) {
    return data.generated_text;
  }

  return String(data);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function extractAudioBlob(result: unknown): Blob {
  // Gradio returns various shapes — handle the common ones
  const data = (result as { data?: unknown[] })?.data;

  if (data && data.length > 0) {
    const first = data[0];

    // Direct Blob
    if (first instanceof Blob) return first;

    // { url: string } — fetch it
    if (first && typeof first === 'object' && 'url' in first) {
      // Return a placeholder — caller should fetch the URL
      // In practice, @gradio/client handles this internally
      return first as unknown as Blob;
    }

    // { path: string, ... } from newer Gradio
    if (first && typeof first === 'object' && 'path' in first) {
      return first as unknown as Blob;
    }
  }

  throw new Error('Unexpected response shape from HF Space');
}
