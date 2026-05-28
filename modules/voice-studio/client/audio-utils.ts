/**
 * Audio utility functions — WAV/MP3 encoding, decoding, format conversion.
 */

// ─── WAV Encoding ───────────────────────────────────────────────────────────

/**
 * Encode PCM float32 samples to WAV format.
 */
export function encodeWav(samples: Float32Array, sampleRate: number, numChannels = 1): Blob {
  const bytesPerSample = 2; // 16-bit PCM
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const headerSize = 44;
  const buffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);

  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Write samples as 16-bit PCM
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    view.setInt16(offset, int16, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

// ─── WAV Decoding ───────────────────────────────────────────────────────────

export interface DecodedAudio {
  samples: Float32Array;
  sampleRate: number;
  numChannels: number;
  duration: number;
}

/**
 * Decode a WAV blob to PCM float32 samples.
 */
export async function decodeWav(blob: Blob): Promise<DecodedAudio> {
  const buffer = await blob.arrayBuffer();
  const view = new DataView(buffer);

  // Parse WAV header
  const numChannels = view.getUint16(22, true);
  const sampleRate = view.getUint32(24, true);
  const bitsPerSample = view.getUint16(34, true);

  // Find data chunk
  const dataOffset = 44;
  const dataSize = view.getUint32(40, true);

  const numSamples = dataSize / (bitsPerSample / 8);
  const samples = new Float32Array(numSamples);

  if (bitsPerSample === 16) {
    for (let i = 0; i < numSamples; i++) {
      const int16 = view.getInt16(dataOffset + i * 2, true);
      samples[i] = int16 / (int16 < 0 ? 0x8000 : 0x7FFF);
    }
  } else if (bitsPerSample === 32) {
    for (let i = 0; i < numSamples; i++) {
      samples[i] = view.getFloat32(dataOffset + i * 4, true);
    }
  }

  return {
    samples,
    sampleRate,
    numChannels,
    duration: numSamples / sampleRate / numChannels,
  };
}

// ─── Web Audio API Decoding (handles any format) ────────────────────────────

/**
 * Decode any audio blob using the Web Audio API.
 * Works with WAV, MP3, OGG, etc.
 */
export async function decodeAudioBlob(blob: Blob): Promise<DecodedAudio> {
  const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  const buffer = await blob.arrayBuffer();
  const audioBuffer = await ctx.decodeAudioData(buffer);

  // Mix down to mono
  const samples = audioBuffer.getChannelData(0);

  await ctx.close();

  return {
    samples,
    sampleRate: audioBuffer.sampleRate,
    numChannels: 1,
    duration: audioBuffer.duration,
  };
}

// ─── MP3 Encoding (via lamejs) ──────────────────────────────────────────────

/**
 * Encode PCM float32 samples to MP3.
 * Requires lamejs to be available.
 */
export async function encodeMp3(
  samples: Float32Array,
  sampleRate: number,
  bitRate = 128
): Promise<Blob> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lamejs = (await import('lamejs')) as any;
  const Mp3Encoder = lamejs.Mp3Encoder ?? lamejs.default?.Mp3Encoder;

  const encoder = new Mp3Encoder(1, sampleRate, bitRate);
  const blockSize = 1152;
  const mp3Data: Uint8Array[] = [];

  // Convert float32 to int16
  const int16Samples = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    int16Samples[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }

  for (let i = 0; i < int16Samples.length; i += blockSize) {
    const chunk = int16Samples.subarray(i, i + blockSize);
    const mp3buf = encoder.encodeBuffer(chunk);
    if (mp3buf.length > 0) {
      mp3Data.push(new Uint8Array(mp3buf));
    }
  }

  const end = encoder.flush();
  if (end.length > 0) {
    mp3Data.push(new Uint8Array(end));
  }

  return new Blob(mp3Data as unknown as BlobPart[], { type: 'audio/mp3' });
}

// ─── Duration Helper ────────────────────────────────────────────────────────

/**
 * Get the duration of an audio blob in seconds.
 */
export async function getAudioDuration(blob: Blob): Promise<number> {
  const decoded = await decodeAudioBlob(blob);
  return decoded.duration;
}

/**
 * Format duration as mm:ss.
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
