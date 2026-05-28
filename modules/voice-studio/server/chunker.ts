/**
 * Long-form text chunker.
 *
 * Splits text into sentence-level chunks that fit within model timing budgets,
 * processes them in parallel, and cross-fades the results.
 */

/** Maximum characters per chunk for TTS models */
const MAX_CHUNK_CHARS = 500;

/** Overlap in ms for cross-fade between chunks */
const CROSSFADE_MS = 50;

/**
 * Split text into sentence-level chunks.
 * Respects sentence boundaries (., !, ?, |, ।) and max length.
 */
export function splitIntoChunks(text: string, maxChars = MAX_CHUNK_CHARS): string[] {
  // Split on sentence-ending punctuation (including Devanagari danda)
  const sentencePattern = /[^.!?।|]+[.!?।|]*/g;
  const sentences = text.match(sentencePattern) ?? [text];

  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    if (current.length + trimmed.length + 1 > maxChars) {
      if (current) chunks.push(current.trim());
      // If a single sentence exceeds max, split on commas or force-split
      if (trimmed.length > maxChars) {
        const subChunks = splitLongSentence(trimmed, maxChars);
        chunks.push(...subChunks);
        current = '';
      } else {
        current = trimmed;
      }
    } else {
      current = current ? `${current} ${trimmed}` : trimmed;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

function splitLongSentence(sentence: string, maxChars: number): string[] {
  // Try splitting on commas first
  const parts = sentence.split(/,\s*/);
  const chunks: string[] = [];
  let current = '';

  for (const part of parts) {
    if (current.length + part.length + 2 > maxChars) {
      if (current) chunks.push(current.trim());
      if (part.length > maxChars) {
        // Force split at word boundaries
        const words = part.split(/\s+/);
        let wordChunk = '';
        for (const word of words) {
          if (wordChunk.length + word.length + 1 > maxChars) {
            if (wordChunk) chunks.push(wordChunk.trim());
            wordChunk = word;
          } else {
            wordChunk = wordChunk ? `${wordChunk} ${word}` : word;
          }
        }
        if (wordChunk) current = wordChunk;
        else current = '';
      } else {
        current = part;
      }
    } else {
      current = current ? `${current}, ${part}` : part;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

/**
 * Process chunks in parallel with concurrency limit.
 */
export async function processChunksParallel<T>(
  chunks: string[],
  processor: (chunk: string, index: number) => Promise<T>,
  concurrency = 3
): Promise<T[]> {
  const results: T[] = new Array(chunks.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < chunks.length) {
      const idx = nextIndex++;
      results[idx] = await processor(chunks[idx], idx);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, chunks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * Cross-fade audio buffers (PCM float32) at boundaries.
 * Returns a single concatenated buffer.
 */
export function crossFadeBuffers(
  buffers: Float32Array[],
  sampleRate: number,
  fadeMs = CROSSFADE_MS
): Float32Array {
  if (buffers.length === 0) return new Float32Array(0);
  if (buffers.length === 1) return buffers[0];

  const fadeSamples = Math.floor((fadeMs / 1000) * sampleRate);
  let totalLength = buffers[0].length;

  for (let i = 1; i < buffers.length; i++) {
    totalLength += buffers[i].length - fadeSamples;
  }

  const output = new Float32Array(totalLength);
  let offset = 0;

  // Copy first buffer
  output.set(buffers[0]);
  offset = buffers[0].length - fadeSamples;

  for (let i = 1; i < buffers.length; i++) {
    const buf = buffers[i];

    // Cross-fade region
    for (let j = 0; j < fadeSamples && j < buf.length; j++) {
      const fadeOut = 1 - j / fadeSamples;
      const fadeIn = j / fadeSamples;
      output[offset + j] = output[offset + j] * fadeOut + buf[j] * fadeIn;
    }

    // Copy rest of buffer after fade region
    if (buf.length > fadeSamples) {
      output.set(buf.subarray(fadeSamples), offset + fadeSamples);
    }

    offset += buf.length - fadeSamples;
  }

  return output.subarray(0, offset + fadeSamples);
}
