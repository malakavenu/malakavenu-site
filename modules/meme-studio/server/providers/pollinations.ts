import { chatComplete, generateImage } from '@/lib/pollinations';
import type { IdeasRequestBody, MemeConcept } from '../../types';
import { buildSystemPrompt, buildUserPrompt } from '../../data/prompts';
import { parseConcepts } from './parse';
import type { ImageGenOptions, ImageGenResult, ImageProvider, TextProvider } from './types';

/** Free Pollinations caption provider (OpenAI-compatible text model). */
export function createPollinationsTextProvider(): TextProvider {
  return {
    id: 'pollinations',
    model: 'openai',
    async generateConcepts(body: IdeasRequestBody): Promise<MemeConcept[]> {
      const content = await chatComplete({
        model: 'openai',
        temperature: 0.85,
        maxTokens: 2000,
        messages: [
          { role: 'system', content: buildSystemPrompt(body) },
          { role: 'user', content: buildUserPrompt(body) },
        ],
      });
      return parseConcepts(content);
    },
  };
}

/** Pollinations image provider (uses POLLINATIONS_API_KEY when set). */
export function createPollinationsImageProvider(model: string): ImageProvider {
  // Prefer Pollinations' premium GPT Image 2, but fall back to FLUX: the
  // gptimage-2 model requires a paid Pollinations tier (returns 402 otherwise),
  // whereas FLUX works on the keyed endpoint for all tiers.
  const preferred = model === 'gpt-image-2' ? 'gptimage-2' : model;
  const candidates = preferred === 'flux' ? ['flux'] : [preferred, 'flux'];
  return {
    id: 'pollinations',
    model: preferred,
    async generateImage(opts: ImageGenOptions): Promise<ImageGenResult> {
      let lastStatus = 0;
      for (const m of candidates) {
        const { response } = await generateImage({
          prompt: opts.prompt,
          model: m,
          width: opts.width,
          height: opts.height,
        });
        if (response.ok && (response.headers.get('content-type') || '').startsWith('image/')) {
          return {
            bytes: await response.arrayBuffer(),
            contentType: response.headers.get('content-type') || 'image/jpeg',
          };
        }
        lastStatus = response.status;
      }
      throw new Error(`Pollinations image failed: ${lastStatus}`);
    },
  };
}
