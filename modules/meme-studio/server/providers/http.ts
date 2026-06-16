/**
 * Small fetch helpers shared by the HTTP-based providers (OpenAI, Anthropic).
 *
 * - `fetchWithTimeout` aborts the request after `timeoutMs` so a hung upstream
 *   never holds the serverless function open until `maxDuration`.
 * - `safeErrorBody` truncates upstream error payloads so we never bubble huge
 *   (or sensitive) response bodies into logs / thrown errors.
 */

/** Default upstream timeout (ms) for a single provider request. */
export const DEFAULT_PROVIDER_TIMEOUT_MS = 60_000;

export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number = DEFAULT_PROVIDER_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new Error(`Upstream request timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** Read an error response body and clamp it to a short, log-safe snippet. */
export async function safeErrorBody(res: Response, max = 300): Promise<string> {
  let text = '';
  try {
    text = await res.text();
  } catch {
    text = '';
  }
  text = text.replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
