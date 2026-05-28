/**
 * Optional audio enhancement: FRCRN denoise + EBU R128 loudness normalisation.
 * OFF by default — toggled via "Studio polish" switch per panel.
 */

import { defaultLogger } from '../adapters/logger';

// ─── EBU R128 Loudness Normalisation ────────────────────────────────────────

/** Target loudness in LUFS (EBU R128 broadcast standard) */
const TARGET_LUFS = -16;

/**
 * Simple loudness measurement (approximation of integrated LUFS).
 * For production, use a proper ITU-R BS.1770 implementation.
 */
function measureLoudness(samples: Float32Array): number {
  let sumSquares = 0;
  for (let i = 0; i < samples.length; i++) {
    sumSquares += samples[i] * samples[i];
  }
  const rms = Math.sqrt(sumSquares / samples.length);
  // Convert to dBFS (approximate LUFS for speech)
  return 20 * Math.log10(rms + 1e-10);
}

/**
 * Normalise audio to target LUFS.
 */
export function normaliseLoudness(
  samples: Float32Array,
  targetLufs = TARGET_LUFS
): Float32Array {
  const currentLufs = measureLoudness(samples);
  const gainDb = targetLufs - currentLufs;
  const gainLinear = Math.pow(10, gainDb / 20);

  // Clamp gain to avoid extreme amplification
  const clampedGain = Math.min(gainLinear, 10);

  const output = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    output[i] = Math.max(-1, Math.min(1, samples[i] * clampedGain));
  }

  return output;
}

// ─── FRCRN Denoise (placeholder — requires ONNX model) ─────────────────────

const denoiseModel: unknown = null;
let denoiseLoadAttempted = false;

/**
 * Attempt to load the FRCRN denoise model.
 * This is optional and fails gracefully.
 */
async function loadDenoiseModel(): Promise<boolean> {
  if (denoiseLoadAttempted) return denoiseModel !== null;
  denoiseLoadAttempted = true;

  try {
    // FRCRN model would be loaded via ONNX runtime
    // For v1, this is a placeholder — the model needs to be vendored
    defaultLogger.info('FRCRN denoise model not yet available — skipping');
    return false;
  } catch (err) {
    defaultLogger.warn('Failed to load FRCRN model', {
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

/**
 * Apply FRCRN denoising to audio.
 * Returns original audio if model isn't available.
 */
export async function denoise(samples: Float32Array, sampleRate: number): Promise<Float32Array> {
  const available = await loadDenoiseModel();
  if (!available) return samples;

  // Placeholder for actual FRCRN inference
  return samples;
}

// ─── Combined Enhancement Pipeline ─────────────────────────────────────────

export interface EnhanceOptions {
  denoise?: boolean;
  normalise?: boolean;
  targetLufs?: number;
}

/**
 * Apply the full "Studio polish" enhancement pipeline.
 */
export async function enhanceAudio(
  samples: Float32Array,
  sampleRate: number,
  options: EnhanceOptions = {}
): Promise<Float32Array> {
  const { denoise: shouldDenoise = true, normalise = true, targetLufs } = options;

  let output = samples;

  // Step 1: Denoise
  if (shouldDenoise) {
    output = await denoise(output, sampleRate);
  }

  // Step 2: Loudness normalisation
  if (normalise) {
    output = normaliseLoudness(output, targetLufs);
  }

  return output;
}
