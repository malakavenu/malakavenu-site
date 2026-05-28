'use client';

/**
 * Browser F5-TTS English voice clone via Transformers.js / ONNX Runtime Web.
 *
 * F5-TTS is a flow-matching TTS model with reference-audio voice cloning.
 * The community ONNX port at `onnx-community/F5-TTS-Base-ONNX` is ~200 MB FP16,
 * a much lighter alternative to Chatterbox for English-only clone fallback.
 *
 * Used as the second-tier browser-side clone option when Chatterbox is too heavy
 * or the language is `en-*` only.
 */

import { defaultLogger } from '../adapters/logger';
import { pcmToWavBlob } from './chatterbox';

export interface F5Progress {
  fraction: number;
  loaded: number;
  total?: number;
  file?: string;
  status: string;
}

export interface F5CloneInput {
  text: string;
  refAudio: Blob;
  refTranscript: string;
  speed?: number;
}

type AnyPipeline = (input: unknown, opts?: unknown) => Promise<unknown>;

const MODEL_ID = 'onnx-community/F5-TTS-Base-ONNX';
const SAMPLE_RATE = 24000;

let pipelineInstance: AnyPipeline | null = null;
let loadingPromise: Promise<AnyPipeline> | null = null;
let progressListeners: Array<(p: F5Progress) => void> = [];

function notifyProgress(p: F5Progress) {
  for (const fn of progressListeners) {
    try {
      fn(p);
    } catch {
      // ignore
    }
  }
}

export function subscribeF5Progress(fn: (p: F5Progress) => void): () => void {
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

async function blobToMonoPcm(blob: Blob, targetSr = SAMPLE_RATE): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer();
  const AC =
    (window as unknown as { AudioContext: typeof AudioContext })
      .AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  const ctx = new AC({ sampleRate: targetSr });
  try {
    const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
    if (decoded.numberOfChannels === 1) {
      return new Float32Array(decoded.getChannelData(0));
    }
    const out = new Float32Array(decoded.length);
    for (let c = 0; c < decoded.numberOfChannels; c++) {
      const data = decoded.getChannelData(c);
      for (let i = 0; i < data.length; i++) out[i] += data[i] / decoded.numberOfChannels;
    }
    return out;
  } finally {
    try {
      await ctx.close();
    } catch {
      // ignore
    }
  }
}

interface LoadOptions {
  onProgress?: (p: F5Progress) => void;
  signal?: AbortSignal;
}

export async function getF5(options: LoadOptions = {}): Promise<AnyPipeline> {
  if (pipelineInstance) return pipelineInstance;
  if (loadingPromise) return loadingPromise;

  const localUnsub = options.onProgress ? subscribeF5Progress(options.onProgress) : () => {};

  loadingPromise = (async () => {
    try {
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
      const dtype = useWebGPU ? 'fp16' : 'q8';

      notifyProgress({
        fraction: 0,
        loaded: 0,
        status: `Initialising F5-TTS (${device})…`,
      });

      defaultLogger.info(`Loading F5-TTS English (device: ${device})`);

      const progress_callback = (evt: {
        status: string;
        file?: string;
        progress?: number;
        loaded?: number;
        total?: number;
      }) => {
        if (options.signal?.aborted) return;
        if (evt.status === 'progress') {
          notifyProgress({
            fraction: typeof evt.progress === 'number' ? evt.progress / 100 : 0,
            loaded: evt.loaded ?? 0,
            total: evt.total,
            file: evt.file,
            status: `Downloading ${evt.file ?? 'model'}…`,
          });
        } else if (evt.status === 'ready') {
          notifyProgress({ fraction: 1, loaded: 0, status: 'F5-TTS ready' });
        }
      };

      const pipe = await transformers.pipeline('text-to-speech', MODEL_ID, {
        device,
        dtype,
        progress_callback,
      });

      pipelineInstance = pipe;
      defaultLogger.info('F5-TTS loaded');
      return pipe;
    } catch (err) {
      loadingPromise = null;
      defaultLogger.error('F5-TTS load failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    } finally {
      localUnsub();
    }
  })();

  return loadingPromise;
}

export interface F5Result {
  blob: Blob;
  pcm: Float32Array;
  sampleRate: number;
  durationMs: number;
}

export async function cloneWithF5(
  input: F5CloneInput,
  options: LoadOptions = {}
): Promise<F5Result> {
  const pipe = await getF5(options);
  const refPcm = await blobToMonoPcm(input.refAudio);

  notifyProgress({ fraction: 1, loaded: 0, status: 'Generating speech…' });

  const t0 = performance.now();
  const raw = (await pipe(input.text, {
    reference_audio: refPcm,
    reference_text: input.refTranscript,
    speed: input.speed ?? 1.0,
  })) as { audio?: Float32Array; sampling_rate?: number; sample_rate?: number };

  const pcm = raw?.audio ?? new Float32Array(0);
  const sr = raw?.sampling_rate ?? raw?.sample_rate ?? SAMPLE_RATE;
  const blob = pcmToWavBlob(pcm, sr);

  return { blob, pcm, sampleRate: sr, durationMs: performance.now() - t0 };
}

export function isF5Loaded(): boolean {
  return pipelineInstance !== null;
}

export function unloadF5(): void {
  pipelineInstance = null;
  loadingPromise = null;
}
