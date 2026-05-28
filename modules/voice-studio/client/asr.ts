/**
 * Auto-transcription using Whisper Large v3 Turbo in-browser.
 *
 * Runs via @huggingface/transformers (ONNX).
 * ~250 MB model, lazy-loaded, persisted to IndexedDB.
 *
 * Critical UX: IndicF5 and Praxy R6 require the transcript of reference audio.
 * This auto-fills that field so users don't have to type it manually.
 */

import { defaultLogger } from '../adapters/logger';

let pipeline: unknown = null;
let loadingPromise: Promise<unknown> | null = null;

/**
 * Lazy-load the Whisper pipeline.
 */
export async function getWhisperPipeline(
  onProgress?: (progress: { status: string; progress?: number }) => void
): Promise<unknown> {
  if (pipeline) return pipeline;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      const { pipeline: createPipeline } = await import('@huggingface/transformers');

      defaultLogger.info('Loading Whisper Large v3 Turbo...');

      const pipe = await createPipeline(
        'automatic-speech-recognition',
        'onnx-community/whisper-large-v3-turbo',
        {
          dtype: {
            encoder_model: 'fp32',
            decoder_model_merged: 'q4',
          },
          device: 'wasm',
          progress_callback: onProgress,
        }
      );

      pipeline = pipe;
      defaultLogger.info('Whisper loaded successfully');
      return pipe;
    } catch (err) {
      loadingPromise = null;
      defaultLogger.error('Failed to load Whisper', {
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  })();

  return loadingPromise;
}

export interface TranscribeResult {
  text: string;
  language?: string;
  chunks?: Array<{ text: string; timestamp: [number, number] }>;
}

/**
 * Transcribe audio using Whisper Large v3 Turbo.
 *
 * @param audio - Audio blob or URL
 * @param languageHint - Optional language hint (ISO 639-1)
 */
export async function transcribe(
  audio: Blob | string,
  languageHint?: string,
  onProgress?: (progress: { status: string; progress?: number }) => void
): Promise<TranscribeResult> {
  const pipe = (await getWhisperPipeline(onProgress)) as (
    input: unknown,
    options?: Record<string, unknown>
  ) => Promise<{ text: string; chunks?: Array<{ text: string; timestamp: [number, number] }> }>;

  // Convert Blob to URL if needed
  let audioInput: string;
  if (audio instanceof Blob) {
    audioInput = URL.createObjectURL(audio);
  } else {
    audioInput = audio;
  }

  try {
    const result = await pipe(audioInput, {
      language: languageHint,
      return_timestamps: true,
      chunk_length_s: 30,
      stride_length_s: 5,
    });

    return {
      text: result.text.trim(),
      chunks: result.chunks,
    };
  } finally {
    // Clean up object URL
    if (audio instanceof Blob) {
      URL.revokeObjectURL(audioInput);
    }
  }
}

/**
 * Check if Whisper is already loaded.
 */
export function isWhisperLoaded(): boolean {
  return pipeline !== null;
}

/**
 * Unload Whisper to free memory.
 */
export function unloadWhisper(): void {
  pipeline = null;
  loadingPromise = null;
}
