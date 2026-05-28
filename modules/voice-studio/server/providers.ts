/**
 * Fallback chain logic.
 *
 * Order: HF Space → HF Inference Providers → Pollinations → browser Kokoro
 *
 * Each provider attempt has a timeout. If it fails or times out,
 * we move to the next in the chain.
 */

import { defaultLogger } from '../adapters/logger';

export interface ProviderAttempt<T> {
  name: string;
  fn: () => Promise<T>;
  timeoutMs?: number;
}

/**
 * Execute a chain of provider attempts, returning the first successful result.
 */
export async function fallbackChain<T>(
  attempts: ProviderAttempt<T>[]
): Promise<T> {
  const errors: Array<{ name: string; error: unknown }> = [];

  for (const attempt of attempts) {
    try {
      const result = await withTimeout(
        attempt.fn(),
        attempt.timeoutMs ?? 45_000
      );
      defaultLogger.info(`Provider succeeded: ${attempt.name}`);
      return result;
    } catch (err) {
      defaultLogger.warn(`Provider failed: ${attempt.name}`, {
        error: err instanceof Error ? err.message : String(err),
      });
      errors.push({ name: attempt.name, error: err });
    }
  }

  throw new AggregateError(
    errors.map((e) => e.error),
    `All providers failed: ${errors.map((e) => e.name).join(', ')}`
  );
}

/**
 * Wrap a promise with a timeout.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timed out after ${ms}ms`));
    }, ms);

    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}
