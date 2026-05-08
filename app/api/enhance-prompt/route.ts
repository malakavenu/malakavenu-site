import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { chatComplete } from '@/lib/pollinations';
import { PROMPT_ENHANCE_SYSTEM } from '@/lib/aiPrompts';

/**
 * /api/enhance-prompt — turn a rough idea into a richly detailed image prompt.
 *
 * POST { prompt: string } → { prompt: string }
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const MAX_INPUT = 600;
const MAX_OUTPUT = 600;

type Body = { prompt?: unknown };

export async function POST(req: NextRequest) {
  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const raw = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  if (!raw) {
    return NextResponse.json({ error: '`prompt` is required.' }, { status: 400 });
  }
  const userPrompt = raw.slice(0, MAX_INPUT);

  try {
    const enhanced = await chatComplete({
      messages: [
        { role: 'system', content: PROMPT_ENHANCE_SYSTEM },
        { role: 'user', content: userPrompt },
      ],
      model: 'openai',
      temperature: 0.8,
      maxTokens: 200,
    });

    const cleaned = enhanced.replace(/^["']+|["']+$/g, '').trim().slice(0, MAX_OUTPUT);
    if (!cleaned) {
      return NextResponse.json(
        { error: 'Enhancer returned an empty response — try a slightly longer rough prompt.' },
        { status: 502 },
      );
    }
    return NextResponse.json({ prompt: cleaned });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Enhance failed.';
    const isAuth = /401|403/.test(msg);
    if (isAuth) console.warn('[enhance-prompt] auth failure:', msg);
    return NextResponse.json(
      {
        error: isAuth
          ? 'Prompt enhancement is temporarily unavailable. Please try again later.'
          : 'Could not enhance your prompt right now. Please try again.',
      },
      { status: isAuth ? 503 : 502 },
    );
  }
}
