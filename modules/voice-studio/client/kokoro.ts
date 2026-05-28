/**
 * In-browser TTS using Kokoro-82M via kokoro-js.
 *
 * Supports: en-US, en-GB, ja, zh, ko, es, fr, pt, it
 * ~80 MB model, lazy-loaded, persisted to IndexedDB automatically.
 */

import { defaultLogger } from '../adapters/logger';

let kokoroInstance: unknown = null;
let loadingPromise: Promise<unknown> | null = null;

/**
 * Check if WebGPU is available for faster inference.
 */
async function hasWebGPU(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('gpu' in navigator)) return false;
  try {
    const adapter = await (navigator as unknown as { gpu: { requestAdapter: () => Promise<unknown> } }).gpu.requestAdapter();
    return !!adapter;
  } catch {
    return false;
  }
}

/**
 * Lazy-load the Kokoro model. Only downloads on first use.
 * Returns the KokoroTTS instance.
 */
export async function getKokoroInstance(
  onProgress?: (progress: number) => void
): Promise<unknown> {
  if (kokoroInstance) return kokoroInstance;

  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      const { KokoroTTS } = await import('kokoro-js');

      const useWebGPU = await hasWebGPU();
      const device = useWebGPU ? 'webgpu' : 'wasm';

      defaultLogger.info(`Loading Kokoro-82M (device: ${device})...`);

      const instance = await KokoroTTS.from_pretrained(
        'onnx-community/Kokoro-82M-v1.0-ONNX',
        { dtype: useWebGPU ? 'fp32' : 'q8', device }
      );

      kokoroInstance = instance;
      defaultLogger.info('Kokoro-82M loaded successfully');
      return instance;
    } catch (err) {
      loadingPromise = null;
      defaultLogger.error('Failed to load Kokoro', {
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  })();

  return loadingPromise;
}

export interface KokoroSynthParams {
  text: string;
  voice?: string;
  langCode?: string;
  speed?: number;
}

/**
 * Synthesise text using Kokoro in the browser.
 * Returns a Blob of audio data (WAV).
 */
export async function synthesiseWithKokoro(params: KokoroSynthParams): Promise<Blob> {
  const { text, voice = 'af_heart', speed = 1.0 } = params;

  const kokoro = (await getKokoroInstance()) as {
    generate: (text: string, options: { voice: string; speed: number }) => Promise<{ toBlob: () => Blob }>;
  };

  const result = await kokoro.generate(text, { voice, speed });
  return result.toBlob();
}

/**
 * Check if Kokoro is already loaded (no download needed).
 */
export function isKokoroLoaded(): boolean {
  return kokoroInstance !== null;
}

/**
 * Unload Kokoro to free memory.
 */
export function unloadKokoro(): void {
  kokoroInstance = null;
  loadingPromise = null;
}
