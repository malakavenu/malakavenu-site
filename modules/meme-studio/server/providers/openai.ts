import type { IdeasRequestBody, MemeConcept } from '../../types';
import { buildSystemPrompt, buildUserPrompt } from '../../data/prompts';
import { parseConcepts } from './parse';
import { fetchWithTimeout, safeErrorBody } from './http';
import type { ImageGenOptions, ImageGenResult, ImageProvider, TextProvider } from './types';

const OPENAI_TEXT_MODEL = 'gpt-4o';
const CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const IMAGE_URL = 'https://api.openai.com/v1/images/generations';

/** OpenAI chat-completions caption provider. */
export function createOpenAITextProvider(apiKey: string): TextProvider {
  return {
    id: 'openai',
    model: OPENAI_TEXT_MODEL,
    async generateConcepts(body: IdeasRequestBody): Promise<MemeConcept[]> {
      const res = await fetchWithTimeout(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: OPENAI_TEXT_MODEL,
          temperature: 0.85,
          messages: [
            { role: 'system', content: buildSystemPrompt(body) },
            { role: 'user', content: buildUserPrompt(body) },
          ],
        }),
      });
      if (!res.ok) {
        throw new Error(`OpenAI chat failed: ${res.status} ${await safeErrorBody(res)}`);
      }
      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      return parseConcepts(json.choices?.[0]?.message?.content ?? '');
    },
  };
}

function nearestSize(width: number, height: number): string {
  const ratio = width / height;
  if (ratio > 1.2) return '1536x1024';
  if (ratio < 0.83) return '1024x1536';
  return '1024x1024';
}

/** OpenAI gpt-image-2 image provider. */
export function createOpenAIImageProvider(apiKey: string, model: string): ImageProvider {
  return {
    id: 'openai',
    model,
    async generateImage(opts: ImageGenOptions): Promise<ImageGenResult> {
      const res = await fetchWithTimeout(IMAGE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          prompt: opts.prompt,
          size: nearestSize(opts.width, opts.height),
          ...(opts.transparent ? { background: 'transparent' } : {}),
        }),
      });
      if (!res.ok) {
        throw new Error(`OpenAI image failed: ${res.status} ${await safeErrorBody(res)}`);
      }
      const json = (await res.json()) as { data?: Array<{ b64_json?: string }> };
      const b64 = json.data?.[0]?.b64_json;
      if (!b64) throw new Error('OpenAI image returned no data');
      return {
        bytes: Buffer.from(b64, 'base64').buffer,
        contentType: 'image/png',
      };
    },
  };
}
