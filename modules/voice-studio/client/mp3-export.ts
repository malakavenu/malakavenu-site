'use client';

/**
 * Client-side MP3 export.
 *
 * Different voice providers return different audio formats:
 *   - Edge TTS  →  audio/mpeg (already MP3 — no encode needed)
 *   - OpenVoice / Chatterbox / HF Spaces  →  audio/wav (PCM)
 *   - MyMemory + Edge fallback in Translate&Speak  →  audio/mpeg
 *
 * Browsers and OS players are happiest with MP3 — WAV downloads can break on
 * iOS Safari, Android default player, Windows Mail attachments, etc. So at
 * download-time we normalise everything to MP3:
 *
 *   1. If the source blob is already audio/mpeg, just rename it.
 *   2. Otherwise decode through the Web Audio API and re-encode with
 *      `@breezystack/lamejs` at 128 kbps CBR (good middle ground for voice).
 *
 * The encoder is dynamic-imported so the ~50 KB library only ships when a
 * user actually triggers a download.
 */

const MP3_KBPS = 128;
// 1152 samples = one MPEG layer-3 frame; feeding the encoder full frames
// minimises padding work and keeps output sizes predictable.
const SAMPLES_PER_FRAME = 1152;

export interface Mp3ExportResult {
  blob: Blob;
  /** Source MIME type before any conversion */
  sourceMimeType: string;
  /** True when the bytes were re-encoded (vs simply re-wrapped). */
  encoded: boolean;
}

/**
 * Convert an audio source URL (blob:, data:, or http:) to an MP3 Blob.
 * Falls back to the raw blob if encoding fails for any reason.
 */
export async function exportAsMp3(sourceUrl: string): Promise<Mp3ExportResult> {
  const res = await fetch(sourceUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch audio source (HTTP ${res.status})`);
  }
  const blob = await res.blob();
  const mime = blob.type || 'application/octet-stream';

  if (mime.startsWith('audio/mpeg') || mime === 'audio/mp3') {
    // Already MP3 — just re-wrap with a guaranteed mime + name.
    return {
      blob: new Blob([await blob.arrayBuffer()], { type: 'audio/mpeg' }),
      sourceMimeType: mime,
      encoded: false,
    };
  }

  try {
    const mp3Blob = await encodeBlobToMp3(blob);
    return { blob: mp3Blob, sourceMimeType: mime, encoded: true };
  } catch (err) {
    console.warn('[voice-studio] MP3 encode failed, returning original blob', err);
    return { blob, sourceMimeType: mime, encoded: false };
  }
}

/**
 * Trigger a browser download of the given MP3 (or fallback) blob using a
 * temporary `<a download>` element. Caller owns the suggested filename.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  if (typeof document === 'undefined') return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Defer revoke so the browser has time to start the download stream.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

// ─── Internal: decode + encode pipeline ──────────────────────────────────

async function encodeBlobToMp3(blob: Blob): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioBuffer = await decodePcm(arrayBuffer);
  const { Mp3Encoder } = await import('@breezystack/lamejs');

  const channels = Math.min(2, audioBuffer.numberOfChannels);
  const sampleRate = audioBuffer.sampleRate;
  const encoder = new Mp3Encoder(channels, sampleRate, MP3_KBPS);

  const leftFloat = audioBuffer.getChannelData(0);
  const rightFloat =
    channels === 2 ? audioBuffer.getChannelData(1) : null;
  const left = floatToInt16(leftFloat);
  const right = rightFloat ? floatToInt16(rightFloat) : null;

  const chunks: Uint8Array[] = [];
  for (let offset = 0; offset < left.length; offset += SAMPLES_PER_FRAME) {
    const end = Math.min(offset + SAMPLES_PER_FRAME, left.length);
    const leftChunk = left.subarray(offset, end);
    const rightChunk = right ? right.subarray(offset, end) : undefined;
    const encoded = encoder.encodeBuffer(leftChunk, rightChunk);
    if (encoded.length > 0) chunks.push(encoded);
  }
  const tail = encoder.flush();
  if (tail.length > 0) chunks.push(tail);

  // BlobPart accepts Uint8Array directly — no need to copy into a single
  // contiguous buffer.
  return new Blob(chunks as BlobPart[], { type: 'audio/mpeg' });
}

async function decodePcm(buffer: ArrayBuffer): Promise<AudioBuffer> {
  const AudioCtor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) {
    throw new Error('Web Audio API not available');
  }
  // A fresh, throwaway AudioContext is fine for decoding — we don't need
  // playback; we just need the analyser pipeline. Using a short sample rate
  // would degrade quality, so let the browser pick its native default.
  const ctx = new AudioCtor();
  try {
    // Some browsers (notably Safari) only accept the legacy callback form,
    // but the modern Promise form works in Chromium/Firefox/Safari ≥14.
    return await ctx.decodeAudioData(buffer.slice(0));
  } finally {
    void ctx.close();
  }
}

function floatToInt16(input: Float32Array): Int16Array {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    // 32767 for positive range, 32768 for negative — symmetrical clipping.
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}
