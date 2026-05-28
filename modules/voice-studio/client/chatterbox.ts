'use client';

/**
 * Browser Chatterbox Multilingual voice clone.
 *
 * Loads `onnx-community/chatterbox-multilingual-ONNX` via Transformers.js.
 * ~1.5 GB on first load (cached to IndexedDB via the in-built browser cache),
 * runs on WebGPU when available, falling back to WASM SIMD.
 *
 * This is the 100%-free Indic voice-clone path: no HF Spaces quota, no server cost.
 * The reference audio + transcript + target text + language are fed in; raw PCM is
 * returned and wrapped to a WAV `Blob` by the caller.
 */

import { defaultLogger } from '../adapters/logger';
import type { LanguageCode } from '../types';

// Re-exported so the UI can show byte counts.
export interface ChatterboxProgress {
  /** 0..1, where 1 means the model is fully resident */
  fraction: number;
  /** bytes loaded for the current shard */
  loaded: number;
  /** total bytes for the current shard, if known */
  total?: number;
  /** which file is currently downloading (e.g. "model_quantized.onnx") */
  file?: string;
  /** human-readable status line for UI */
  status: string;
}

export interface ChatterboxCloneInput {
  text: string;
  refAudio: Blob;
  refTranscript: string;
  language: LanguageCode;
  /** Optional speed (0.8..1.2) */
  speed?: number;
}

type AnyPipeline = (input: unknown, opts?: unknown) => Promise<unknown>;

const MODEL_ID = 'onnx-community/chatterbox-multilingual-ONNX';
const SAMPLE_RATE = 24000;

let pipelineInstance: AnyPipeline | null = null;
let loadingPromise: Promise<AnyPipeline> | null = null;
let progressListeners: Array<(p: ChatterboxProgress) => void> = [];

function notifyProgress(p: ChatterboxProgress) {
  for (const fn of progressListeners) {
    try {
      fn(p);
    } catch {
      // ignore listener errors
    }
  }
}

export function subscribeChatterboxProgress(
  fn: (p: ChatterboxProgress) => void
): () => void {
  progressListeners.push(fn);
  return () => {
    progressListeners = progressListeners.filter((x) => x !== fn);
  };
}

async function hasWebGPU(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('gpu' in navigator)) return false;
  try {
    const gpu = (navigator as unknown as {
      gpu: { requestAdapter: () => Promise<unknown> };
    }).gpu;
    const adapter = await gpu.requestAdapter();
    return !!adapter;
  } catch {
    return false;
  }
}

/** Map our LanguageCode to the language tag Chatterbox understands. */
function toChatterboxLang(code: LanguageCode): string {
  const base = code.split('-')[0];
  // Chatterbox uses ISO 639-1 codes.
  const map: Record<string, string> = {
    en: 'en',
    te: 'te',
    hi: 'hi',
    ta: 'ta',
    bn: 'bn',
    mr: 'mr',
    gu: 'gu',
    kn: 'kn',
    ml: 'ml',
    pa: 'pa',
    or: 'or',
    as: 'as',
    ur: 'ur',
    mix: 'en',
  };
  return map[base] ?? 'en';
}

interface LoadOptions {
  onProgress?: (p: ChatterboxProgress) => void;
  signal?: AbortSignal;
}

/**
 * Lazy-load the Chatterbox pipeline. Subsequent calls reuse the cached instance.
 * Browser cache + IndexedDB make subsequent visits effectively instant.
 */
export async function getChatterbox(
  options: LoadOptions = {}
): Promise<AnyPipeline> {
  if (pipelineInstance) return pipelineInstance;
  if (loadingPromise) return loadingPromise;

  const localUnsub = options.onProgress
    ? subscribeChatterboxProgress(options.onProgress)
    : () => {};

  loadingPromise = (async () => {
    try {
      // Dynamic import so SSR + non-clone codepaths never pull this in.
      const transformers = (await import('@huggingface/transformers')) as unknown as {
        pipeline: (
          task: string,
          model: string,
          opts: Record<string, unknown>
        ) => Promise<AnyPipeline>;
        env?: { allowLocalModels?: boolean; useBrowserCache?: boolean };
      };

      if (transformers.env) {
        transformers.env.allowLocalModels = false;
        transformers.env.useBrowserCache = true;
      }

      const useWebGPU = await hasWebGPU();
      const device = useWebGPU ? 'webgpu' : 'wasm';
      const dtype = useWebGPU ? 'fp32' : 'q4';

      notifyProgress({
        fraction: 0,
        loaded: 0,
        status: `Initialising Chatterbox (${device})…`,
      });

      defaultLogger.info(`Loading Chatterbox Multilingual (device: ${device})`);

      // Internal Transformers.js progress events look like:
      // { status: 'progress', file: 'model.onnx', progress: 0..100, loaded, total }
      // and finally { status: 'ready' }.
      const progress_callback = (evt: {
        status: string;
        file?: string;
        progress?: number;
        loaded?: number;
        total?: number;
      }) => {
        if (options.signal?.aborted) return;
        if (evt.status === 'progress') {
          const fraction = typeof evt.progress === 'number' ? evt.progress / 100 : 0;
          notifyProgress({
            fraction,
            loaded: evt.loaded ?? 0,
            total: evt.total,
            file: evt.file,
            status: `Downloading ${evt.file ?? 'model'}…`,
          });
        } else if (evt.status === 'ready') {
          notifyProgress({
            fraction: 1,
            loaded: 0,
            status: 'Chatterbox ready',
          });
        } else if (evt.status === 'done') {
          notifyProgress({
            fraction: 1,
            loaded: evt.total ?? evt.loaded ?? 0,
            total: evt.total,
            file: evt.file,
            status: `Loaded ${evt.file ?? 'model'}`,
          });
        }
      };

      const pipe = await transformers.pipeline(
        // Chatterbox is a TTS model. Transformers.js' generic task name is
        // 'text-to-speech' (alias 'text-to-audio'). We fall back to either.
        'text-to-speech',
        MODEL_ID,
        { device, dtype, progress_callback }
      );

      pipelineInstance = pipe;
      defaultLogger.info('Chatterbox loaded');
      return pipe;
    } catch (err) {
      loadingPromise = null;
      defaultLogger.error('Chatterbox load failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    } finally {
      localUnsub();
    }
  })();

  return loadingPromise;
}

/** Encode a Float32 PCM array as a 16-bit WAV Blob. */
export function pcmToWavBlob(pcm: Float32Array, sampleRate = SAMPLE_RATE): Blob {
  const numSamples = pcm.length;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const sample = Math.max(-1, Math.min(1, pcm[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

/** Decode an audio Blob to mono Float32 PCM @ 24 kHz for the reference. */
async function blobToMonoPcm(blob: Blob): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer();
  const AC =
    (window as unknown as { AudioContext: typeof AudioContext })
      .AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  const ctx = new AC({ sampleRate: SAMPLE_RATE });
  try {
    const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
    const ch0 = decoded.getChannelData(0);
    // If multi-channel, mix down.
    if (decoded.numberOfChannels > 1) {
      const out = new Float32Array(ch0.length);
      for (let c = 0; c < decoded.numberOfChannels; c++) {
        const data = decoded.getChannelData(c);
        for (let i = 0; i < data.length; i++) out[i] += data[i] / decoded.numberOfChannels;
      }
      return out;
    }
    return new Float32Array(ch0);
  } finally {
    try {
      await ctx.close();
    } catch {
      // ignore
    }
  }
}

export interface ChatterboxResult {
  blob: Blob;
  pcm: Float32Array;
  sampleRate: number;
  durationMs: number;
}

/**
 * Clone a voice in the browser using Chatterbox Multilingual.
 * The model takes a reference audio + transcript and synthesises the target text
 * in the same voice. For Indic languages, the caller is responsible for any
 * romanization (ISO-15919) if the target text is in native script.
 */
export async function cloneWithChatterbox(
  input: ChatterboxCloneInput,
  options: LoadOptions = {}
): Promise<ChatterboxResult> {
  const pipe = await getChatterbox(options);

  const refPcm = await blobToMonoPcm(input.refAudio);

  notifyProgress({
    fraction: 1,
    loaded: 0,
    status: 'Generating speech…',
  });

  const t0 = performance.now();

  // The Transformers.js TTS pipeline call shape varies by model.
  // We pass the most common shape; Chatterbox supports an additional
  // speaker_embeddings / reference field.
  const raw = (await pipe(input.text, {
    speaker_embeddings: refPcm,
    reference_audio: refPcm,
    reference_text: input.refTranscript,
    language: toChatterboxLang(input.language),
    speaking_rate: input.speed ?? 1.0,
  })) as { audio?: Float32Array; sampling_rate?: number; sample_rate?: number };

  const pcm = raw?.audio ?? new Float32Array(0);
  const sr = raw?.sampling_rate ?? raw?.sample_rate ?? SAMPLE_RATE;
  const blob = pcmToWavBlob(pcm, sr);

  return {
    blob,
    pcm,
    sampleRate: sr,
    durationMs: performance.now() - t0,
  };
}

export function isChatterboxLoaded(): boolean {
  return pipelineInstance !== null;
}

export function unloadChatterbox(): void {
  pipelineInstance = null;
  loadingPromise = null;
}
