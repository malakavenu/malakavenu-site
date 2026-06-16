import type { IdeasRequestBody, MemeConcept } from '../../types';
import { buildSystemPrompt, buildUserPrompt } from '../../data/prompts';
import { parseConcepts } from './parse';
import { fetchWithTimeout, safeErrorBody } from './http';
import type { TextProvider } from './types';

const ANTHROPIC_MODEL = 'claude-3-5-sonnet-latest';
const URL = 'https://api.anthropic.com/v1/messages';

/** Anthropic Messages API caption provider (captions only — no image gen). */
export function createAnthropicTextProvider(apiKey: string): TextProvider {
  return {
    id: 'anthropic',
    model: ANTHROPIC_MODEL,
    async generateConcepts(body: IdeasRequestBody): Promise<MemeConcept[]> {
      const res = await fetchWithTimeout(URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: ANTHROPIC_MODEL,
          max_tokens: 2000,
          temperature: 0.85,
          system: buildSystemPrompt(body),
          messages: [{ role: 'user', content: buildUserPrompt(body) }],
        }),
      });
      if (!res.ok) {
        throw new Error(`Anthropic failed: ${res.status} ${await safeErrorBody(res)}`);
      }
      const json = (await res.json()) as {
        content?: Array<{ type?: string; text?: string }>;
      };
      const text = (json.content ?? [])
        .filter((b) => b.type === 'text' && typeof b.text === 'string')
        .map((b) => b.text)
        .join('');
      return parseConcepts(text);
    },
  };
}
