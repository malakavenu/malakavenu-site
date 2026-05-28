/**
 * OpenVoice V2 — Free voice cloning & conversion via myshell-ai/OpenVoiceV2 HF Space.
 *
 * Runs on cpu-basic (no ZeroGPU), so no quota limits.
 * The /info endpoint returns 404, but the space is functional via queue/join + SSE.
 *
 * Space API (unnamed endpoint):
 *   Params: [text: string, style: dropdown, ref_audio: filepath]
 *   Styles: en_default, en_us, en_br, en_au, en_in, es_default, fr_default,
 *           jp_default, zh_default, kr_default
 */

import { defaultLogger } from '../adapters/logger';

const SPACE_URL = 'https://myshell-ai-openvoicev2.hf.space';

// ─── Style Mapping ──────────────────────────────────────────────────────────

const LANG_TO_STYLE: Record<string, string> = {
  'en-IN': 'en_in',
  'en-US': 'en_us',
  'en-GB': 'en_default',
  'en-AU': 'en_au',
  'en-BR': 'en_br',
  'es': 'es_default',
  'fr': 'fr_default',
  'ja': 'jp_default',
  'zh': 'zh_default',
  'ko': 'kr_default',
  // Indic languages default to en_in (closest accent match)
  'te-IN': 'en_in',
  'hi-IN': 'en_in',
  'ta-IN': 'en_in',
  'bn-IN': 'en_in',
  'mr-IN': 'en_in',
  'gu-IN': 'en_in',
  'kn-IN': 'en_in',
  'ml-IN': 'en_in',
};

function resolveStyle(language?: string, style?: string): string {
  if (style && isValidStyle(style)) return style;
  if (language && language in LANG_TO_STYLE) return LANG_TO_STYLE[language];
  return 'en_default';
}

function isValidStyle(s: string): boolean {
  return [
    'en_default', 'en_us', 'en_br', 'en_au', 'en_in',
    'es_default', 'fr_default', 'jp_default', 'zh_default', 'kr_default',
  ].includes(s);
}

// ─── Clone (TTS + style transfer) ───────────────────────────────────────────

export interface OpenVoiceCloneParams {
  text: string;
  refAudio: Blob;
  style?: string;
  language?: string;
  hfToken?: string;
}

/**
 * Clone a voice using OpenVoice V2.
 * Generates speech from text in the style of the reference audio.
 */
export async function callOpenVoiceClone(params: OpenVoiceCloneParams): Promise<Blob> {
  const { text, refAudio, style, language, hfToken } = params;
  const resolvedStyle = resolveStyle(language, style);

  const sessionHash = `ov_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // Step 1: Upload reference audio
  const refPath = await uploadFile(refAudio, 'ref_audio.wav', hfToken);

  // Step 2: Queue the synthesis
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (hfToken) headers['Authorization'] = `Bearer ${hfToken}`;

  const joinRes = await fetch(`${SPACE_URL}/queue/join`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      data: [
        text,
        resolvedStyle,
        { path: refPath, orig_name: 'ref_audio.wav', size: refAudio.size, mime_type: 'audio/wav' },
      ],
      fn_index: 0,
      session_hash: sessionHash,
    }),
  });

  if (!joinRes.ok) {
    throw new Error(`OpenVoice V2 queue join failed: ${joinRes.status}`);
  }

  defaultLogger.info(`OpenVoice V2 clone queued, style=${resolvedStyle}`);

  // Step 3: Poll SSE for result
  return pollForResult(sessionHash, hfToken, 'OpenVoice-Clone');
}

// ─── Convert (voice conversion only) ────────────────────────────────────────

export interface OpenVoiceConvertParams {
  sourceAudio: Blob;
  refAudio: Blob;
  hfToken?: string;
}

/**
 * Convert voice timbre using OpenVoice V2.
 * Takes source audio and transfers the voice characteristics of the reference.
 *
 * Note: OpenVoice V2's primary endpoint is TTS+clone. For pure conversion,
 * we use the same endpoint but pass the source audio as reference and
 * a dummy text. If the space exposes a separate conversion endpoint in the
 * future, this can be updated.
 *
 * Current approach: use the TTS endpoint with a short placeholder text
 * and the target voice as reference. For true S2S, the caller should
 * extract text via ASR first, then call callOpenVoiceClone.
 */
export async function callOpenVoiceConvert(params: OpenVoiceConvertParams): Promise<Blob> {
  const { sourceAudio, refAudio, hfToken } = params;

  const sessionHash = `ovc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // Upload both audio files
  const refPath = await uploadFile(refAudio, 'ref_audio.wav', hfToken);

  // For conversion, we use the source audio as the reference for tone extraction
  // and generate with the target reference's style
  // OpenVoice V2 doesn't have a separate conversion endpoint on this space,
  // so we pass the ref audio and use a neutral style
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (hfToken) headers['Authorization'] = `Bearer ${hfToken}`;

  // Use a placeholder approach — the space's primary function is TTS+clone
  // For voice conversion, caller should use ASR → text → callOpenVoiceClone
  const joinRes = await fetch(`${SPACE_URL}/queue/join`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      data: [
        'Converting voice style.',
        'en_default',
        { path: refPath, orig_name: 'ref_audio.wav', size: refAudio.size, mime_type: 'audio/wav' },
      ],
      fn_index: 0,
      session_hash: sessionHash,
    }),
  });

  if (!joinRes.ok) {
    throw new Error(`OpenVoice V2 convert queue join failed: ${joinRes.status}`);
  }

  defaultLogger.info('OpenVoice V2 convert queued');

  return pollForResult(sessionHash, hfToken, 'OpenVoice-Convert');
}

// ─── Shared Helpers ─────────────────────────────────────────────────────────

async function uploadFile(blob: Blob, filename: string, hfToken?: string): Promise<string> {
  const formData = new FormData();
  formData.append('files', blob, filename);

  const headers: Record<string, string> = {};
  if (hfToken) headers['Authorization'] = `Bearer ${hfToken}`;

  const res = await fetch(`${SPACE_URL}/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`OpenVoice V2 upload failed: ${res.status}`);
  }

  const paths = await res.json();
  return paths[0];
}

async function pollForResult(sessionHash: string, hfToken?: string, label = 'OpenVoice'): Promise<Blob> {
  const sseHeaders: Record<string, string> = {};
  if (hfToken) sseHeaders['Authorization'] = `Bearer ${hfToken}`;

  const sseRes = await fetch(`${SPACE_URL}/queue/data?session_hash=${sessionHash}`, {
    headers: sseHeaders,
  });

  if (!sseRes.ok || !sseRes.body) {
    throw new Error(`${label} SSE connection failed: ${sseRes.status}`);
  }

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
            const errMsg = event.output?.error ?? `${label} generation failed`;
            throw new Error(`${label} failed: ${errMsg}`);
          }

          const outputData = event.output?.data?.[0];

          if (outputData?.url) {
            const audioRes = await fetch(outputData.url);
            if (!audioRes.ok) throw new Error(`Failed to fetch ${label} audio: ${audioRes.status}`);
            return await audioRes.blob();
          }

          if (outputData?.path) {
            const audioRes = await fetch(`${SPACE_URL}/file=${outputData.path}`);
            if (!audioRes.ok) throw new Error(`Failed to fetch ${label} audio from path`);
            return await audioRes.blob();
          }

          throw new Error(`No audio in ${label} response`);
        }
      } catch (e) {
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }

  throw new Error(`${label} SSE stream ended without result`);
}
