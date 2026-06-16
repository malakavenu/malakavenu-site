import type { MemeStudioConfig } from '../../types';
import { defaultEnv, defaultLogger } from '../../adapters/env';
import { createCursorTextProvider, createCursorSvgImageProvider } from './cursor-sdk';
import { createAnthropicTextProvider } from './anthropic';
import { createOpenAITextProvider, createOpenAIImageProvider } from './openai';
import {
  createPollinationsImageProvider,
  createPollinationsTextProvider,
} from './pollinations';
import type { ImageProvider, ProviderEnv, TextProvider } from './types';

/** Merge host-injected env with process.env defaults. */
export function resolveEnv(config: MemeStudioConfig): ProviderEnv {
  const e = config.adapters.env ?? {};
  return {
    CURSOR_API_KEY: e.CURSOR_API_KEY ?? defaultEnv.CURSOR_API_KEY,
    CURSOR_MODEL: e.CURSOR_MODEL ?? defaultEnv.CURSOR_MODEL,
    OPENAI_API_KEY: e.OPENAI_API_KEY ?? defaultEnv.OPENAI_API_KEY,
    ANTHROPIC_API_KEY: e.ANTHROPIC_API_KEY ?? defaultEnv.ANTHROPIC_API_KEY,
    POLLINATIONS_API_KEY: e.POLLINATIONS_API_KEY ?? defaultEnv.POLLINATIONS_API_KEY,
  };
}

/** Build the ordered list of available text providers honoring the preference. */
export function buildTextProviders(config: MemeStudioConfig): TextProvider[] {
  const env = resolveEnv(config);
  const model = env.CURSOR_MODEL || config.cursorModel;

  const available: Record<string, () => TextProvider | null> = {
    cursor: () => (env.CURSOR_API_KEY ? createCursorTextProvider(env.CURSOR_API_KEY, model) : null),
    anthropic: () =>
      env.ANTHROPIC_API_KEY ? createAnthropicTextProvider(env.ANTHROPIC_API_KEY) : null,
    openai: () => (env.OPENAI_API_KEY ? createOpenAITextProvider(env.OPENAI_API_KEY) : null),
    // Gated behind a key so /ideas can't be abused as a free, keyless LLM proxy.
    pollinations: () =>
      env.POLLINATIONS_API_KEY ? createPollinationsTextProvider() : null,
  };

  // Auto order: Cursor → Anthropic → OpenAI → Pollinations.
  const autoOrder = ['cursor', 'anthropic', 'openai', 'pollinations'];
  const order =
    config.textProvider === 'auto'
      ? autoOrder
      : [config.textProvider, ...autoOrder.filter((p) => p !== config.textProvider)];

  return order
    .map((id) => available[id]?.())
    .filter((p): p is TextProvider => Boolean(p));
}

/** Build the ordered list of available image providers honoring the preference. */
export function buildImageProviders(config: MemeStudioConfig): ImageProvider[] {
  const env = resolveEnv(config);
  const cursorModel = env.CURSOR_MODEL || config.cursorModel;

  const available: Record<string, () => ImageProvider | null> = {
    cursor: () =>
      env.CURSOR_API_KEY ? createCursorSvgImageProvider(env.CURSOR_API_KEY, cursorModel) : null,
    openai: () =>
      env.OPENAI_API_KEY ? createOpenAIImageProvider(env.OPENAI_API_KEY, config.imageModel) : null,
    pollinations: () => createPollinationsImageProvider(config.imageModel),
  };

  const autoOrder = ['cursor', 'openai', 'pollinations'];
  const order =
    config.imageProvider === 'auto'
      ? autoOrder
      : [config.imageProvider, ...autoOrder.filter((p) => p !== config.imageProvider)];

  return order
    .map((id) => available[id]?.())
    .filter((p): p is ImageProvider => Boolean(p));
}

/** Run an async op against an ordered provider list, falling back on failure. */
export async function withFallback<P extends { id: string }, R>(
  providers: P[],
  run: (provider: P) => Promise<R>,
): Promise<{ result: R; provider: P }> {
  let lastError: unknown;
  for (const provider of providers) {
    try {
      const result = await run(provider);
      return { result, provider };
    } catch (err) {
      lastError = err;
      defaultLogger.warn(`provider "${provider.id}" failed; trying next`, {
        error: (err as Error).message,
      });
    }
  }
  throw lastError ?? new Error('No providers available');
}
