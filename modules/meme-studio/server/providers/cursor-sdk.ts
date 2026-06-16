import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Agent } from '@cursor/sdk';
import type { IdeasRequestBody, MemeConcept } from '../../types';
import { buildRetryPrompt, buildSystemPrompt, buildUserPrompt } from '../../data/prompts';
import { parseConcepts } from './parse';
import type { ImageGenOptions, ImageGenResult, ImageProvider, TextProvider } from './types';

const MAX_RETRIES = 2;

/** A single bound `send(prompt) -> assistant text` against one live agent. */
type Send = (prompt: string) => Promise<string>;

/**
 * Creates an isolated Cursor agent (scratch cwd, no inherited settings/MCP),
 * hands a `send()` to the caller, and always disposes + cleans up after.
 * Mirrors the proven COREUI cursor-bridge pattern.
 */
async function withCursorAgent<T>(
  apiKey: string,
  model: string,
  run: (send: Send) => Promise<T>,
): Promise<T> {
  const scratch = mkdtempSync(join(tmpdir(), 'meme-studio-'));
  let agent: Awaited<ReturnType<typeof Agent.create>> | undefined;
  try {
    agent = await Agent.create({
      apiKey,
      model: { id: model },
      local: { cwd: scratch, settingSources: [] },
    });

    const send: Send = async (prompt) => {
      const turn = await agent!.send(prompt);
      let text = '';
      for await (const event of turn.stream() as AsyncGenerator<{
        type?: string;
        message?: { content?: Array<{ type?: string; text?: string }> };
      }>) {
        if (event.type === 'assistant' && event.message?.content) {
          for (const block of event.message.content) {
            if (block.type === 'text' && typeof block.text === 'string') text += block.text;
          }
        }
      }
      await turn.wait();
      return text;
    };

    return await run(send);
  } finally {
    try {
      await agent?.[Symbol.asyncDispose]?.();
    } catch {
      // ignore dispose errors
    }
    rmSync(scratch, { recursive: true, force: true });
  }
}

/** Cursor SDK text provider — generates grounded meme concepts (validate + retry). */
export function createCursorTextProvider(apiKey: string, model: string): TextProvider {
  return {
    id: 'cursor',
    model,
    async generateConcepts(body: IdeasRequestBody): Promise<MemeConcept[]> {
      return withCursorAgent(apiKey, model, async (send) => {
        let prompt = `${buildSystemPrompt(body)}\n\n${buildUserPrompt(body)}`;
        let lastError = '';
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          const text = await send(prompt);
          try {
            return parseConcepts(text);
          } catch (err) {
            lastError = (err as Error).message;
            prompt = buildRetryPrompt(lastError);
          }
        }
        throw new Error(`Cursor SDK output unusable after retries: ${lastError}`);
      });
    },
  };
}

/** Pull the first complete <svg>…</svg> block out of a model response. */
function extractSvg(raw: string): string {
  const match = raw.match(/<svg[\s\S]*?<\/svg>/i);
  if (!match) throw new Error('no <svg> element in response');
  return match[0];
}

function buildSvgPrompt(opts: ImageGenOptions): string {
  const w = 1024;
  const h = Math.max(256, Math.round((1024 * opts.height) / opts.width));
  const bg = opts.transparent
    ? 'Transparent background — do NOT add a full-canvas background rectangle.'
    : 'Include a tasteful full-canvas background.';
  return [
    'You are an SVG illustration engine.',
    `Output ONLY one self-contained SVG illustrating: ${opts.prompt}`,
    'Hard rules:',
    `- Root must be <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">.`,
    '- Bold flat vector style, vibrant colors, clean shapes, smooth gradients allowed.',
    `- ${bg}`,
    '- Absolutely NO text/letters in the artwork.',
    '- No markdown, no code fences, no explanation. Start with <svg and end with </svg>.',
  ].join('\n');
}

/**
 * Cursor SDK "image" provider — the model emits SVG vector art (stickers,
 * symbols, illustrations, stylized backgrounds). SVG has native transparency
 * and the canvas compositor renders it directly. Not for photoreal scenes.
 */
export function createCursorSvgImageProvider(apiKey: string, model: string): ImageProvider {
  return {
    id: 'cursor',
    model,
    async generateImage(opts: ImageGenOptions): Promise<ImageGenResult> {
      const svg = await withCursorAgent(apiKey, model, async (send) => {
        let out = await send(buildSvgPrompt(opts));
        try {
          return extractSvg(out);
        } catch {
          out = await send(
            'Resend ONLY the SVG markup, starting with <svg and ending with </svg>, no prose or fences.',
          );
          return extractSvg(out);
        }
      });
      return {
        bytes: new TextEncoder().encode(svg).buffer,
        contentType: 'image/svg+xml',
      };
    },
  };
}
