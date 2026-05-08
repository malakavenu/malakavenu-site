/**
 * Thin client for Pollinations.ai — our chosen free AI provider.
 *
 * - Text + chat completions (OpenAI-compatible)
 * - Text-to-speech (MP3)
 * - Image generation (text-to-image)
 *
 * Image generation gracefully falls back to the legacy keyless endpoint
 * (`image.pollinations.ai`) when no API key is configured. Text and audio
 * always require a `POLLINATIONS_API_KEY` (free Seed tier at
 * https://enter.pollinations.ai).
 */

const GEN_BASE = 'https://gen.pollinations.ai';
const LEGACY_IMAGE = 'https://image.pollinations.ai';

export const POLLINATIONS_IMAGE_MODELS = [
  { id: 'flux', label: 'FLUX (default, fast)' },
  { id: 'gptimage-2', label: 'GPT Image 2 (premium quality)' },
  { id: 'seedream', label: 'Seedream (artistic)' },
  { id: 'turbo', label: 'Turbo (fastest)' },
] as const;

export const POLLINATIONS_VOICES = [
  'nova',
  'alloy',
  'echo',
  'fable',
  'onyx',
  'shimmer',
  'sage',
] as const;

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

function authHeader(): Record<string, string> {
  const key = process.env.POLLINATIONS_API_KEY?.trim();
  return key ? { Authorization: `Bearer ${key}` } : {};
}

export function hasPollinationsKey(): boolean {
  return Boolean(process.env.POLLINATIONS_API_KEY?.trim());
}

/**
 * OpenAI-compatible chat completions, optionally streaming SSE.
 * Caller is responsible for piping the response.body to the client.
 */
export async function chatCompletion(opts: {
  messages: ChatMessage[];
  model?: string;
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}): Promise<Response> {
  const {
    messages,
    model = 'openai',
    stream = false,
    temperature = 0.7,
    maxTokens = 800,
    signal,
  } = opts;

  return fetch(`${GEN_BASE}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: stream ? 'text/event-stream' : 'application/json',
      ...authHeader(),
    },
    body: JSON.stringify({
      model,
      messages,
      stream,
      temperature,
      max_tokens: maxTokens,
    }),
    signal,
  });
}

/**
 * Returns a single string completion (non-streaming).
 * Convenience wrapper around chatCompletion.
 */
export async function chatComplete(opts: {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const res = await chatCompletion({ ...opts, stream: false });
  if (!res.ok) {
    throw new Error(`Pollinations chat failed: ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return json.choices?.[0]?.message?.content?.trim() ?? '';
}

/**
 * Text-to-speech — returns an MP3 stream Response from Pollinations.
 * If no API key is configured, throws so the caller can return 503.
 */
export async function textToSpeech(opts: {
  text: string;
  voice?: (typeof POLLINATIONS_VOICES)[number];
  signal?: AbortSignal;
}): Promise<Response> {
  if (!hasPollinationsKey()) {
    throw new Error(
      'POLLINATIONS_API_KEY required for text-to-speech. Get a free key at https://enter.pollinations.ai.',
    );
  }
  const { text, voice = 'nova', signal } = opts;
  const params = new URLSearchParams({ voice });
  const url = `${GEN_BASE}/audio/${encodeURIComponent(text)}?${params}`;
  return fetch(url, {
    method: 'GET',
    headers: { ...authHeader(), Accept: 'audio/mpeg' },
    signal,
  });
}

/**
 * Image generation — uses the gen.pollinations.ai endpoint when an API key
 * is present (gives access to gpt-image-2 etc.); otherwise falls back to
 * the legacy keyless image.pollinations.ai endpoint with FLUX.
 */
export async function generateImage(opts: {
  prompt: string;
  model?: string;
  width?: number;
  height?: number;
  seed?: number;
  signal?: AbortSignal;
}): Promise<{ response: Response; provider: 'pollinations-keyed' | 'pollinations-legacy' }> {
  const { prompt, model = 'flux', width = 1024, height = 1024, seed, signal } = opts;

  if (hasPollinationsKey()) {
    const params = new URLSearchParams({
      model,
      width: String(width),
      height: String(height),
      nologo: 'true',
      referrer: 'malakavenu.com',
    });
    if (seed !== undefined) params.set('seed', String(seed));

    const url = `${GEN_BASE}/image/${encodeURIComponent(prompt)}?${params}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { ...authHeader(), Accept: 'image/jpeg' },
      signal,
    });
    if (res.ok && (res.headers.get('content-type') || '').startsWith('image/')) {
      return { response: res, provider: 'pollinations-keyed' };
    }
  }

  // Legacy keyless fallback. Always FLUX, smaller pool of features.
  const legacyParams = new URLSearchParams({
    model: model === 'gptimage-2' ? 'flux' : model,
    width: String(width),
    height: String(height),
    nologo: 'true',
    referrer: 'malakavenu.com',
  });
  if (seed !== undefined) legacyParams.set('seed', String(seed));
  const legacyUrl = `${LEGACY_IMAGE}/prompt/${encodeURIComponent(prompt)}?${legacyParams}`;
  const res = await fetch(legacyUrl, {
    method: 'GET',
    headers: { Accept: 'image/jpeg' },
    signal,
  });
  return { response: res, provider: 'pollinations-legacy' };
}
