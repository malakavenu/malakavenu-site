import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { chatCompletion, type ChatMessage } from '@/lib/pollinations';
import { buildAskMalakaSystemPrompt, buildArticleSystemPrompt } from '@/lib/aiPrompts';
import { getArticleBySlug } from '@/lib/articles';

/**
 * /api/chat — streaming chat for "Ask Malaka" and per-article Q&A.
 *
 * POST body:
 *   {
 *     messages: [{ role, content }, ...],   // user/assistant turns only
 *     scope?: 'site'                          // default: ask-Malaka site assistant
 *           | { kind: 'article', slug: string }
 *   }
 *
 * Streams Server-Sent Events from Pollinations chat completions through to the
 * client unchanged. Caller can use the OpenAI streaming format on the client side.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_TURNS = 20;
const MAX_USER_LEN = 2000;

type Scope = 'site' | { kind: 'article'; slug: string };

type Body = {
  messages?: Array<{ role?: string; content?: string }>;
  scope?: Scope;
  model?: string;
};

function sanitizeMessages(raw: Body['messages']): ChatMessage[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out: ChatMessage[] = [];
  for (const m of raw.slice(-MAX_TURNS)) {
    if (!m || typeof m.content !== 'string') continue;
    if (m.role !== 'user' && m.role !== 'assistant') continue;
    const content = m.content.trim().slice(0, MAX_USER_LEN);
    if (!content) continue;
    out.push({ role: m.role, content });
  }
  if (!out.length || out[out.length - 1]?.role !== 'user') return null;
  return out;
}

async function resolveSystemPrompt(scope: Scope | undefined): Promise<string> {
  if (scope && typeof scope === 'object' && scope.kind === 'article') {
    const article = await getArticleBySlug(scope.slug);
    if (article) {
      return buildArticleSystemPrompt({
        title: article.title,
        description: article.description,
        content: article.content,
      });
    }
  }
  return buildAskMalakaSystemPrompt();
}

export async function POST(req: NextRequest) {
  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const messages = sanitizeMessages(body.messages);
  if (!messages) {
    return NextResponse.json(
      { error: 'A non-empty `messages` array ending with a user turn is required.' },
      { status: 400 },
    );
  }

  const system = await resolveSystemPrompt(body.scope);
  const upstream = await chatCompletion({
    messages: [{ role: 'system', content: system }, ...messages],
    model: body.model || 'openai',
    stream: true,
    temperature: 0.6,
    maxTokens: 700,
  });

  if (!upstream.ok || !upstream.body) {
    let detail = `${upstream.status} ${upstream.statusText}`;
    try {
      const text = await upstream.text();
      if (text) detail += ` — ${text.slice(0, 240)}`;
    } catch {
      // ignore
    }
    console.warn('[chat] upstream failure:', detail);
    const status = upstream.status === 401 || upstream.status === 403 ? 503 : 502;
    const message =
      status === 503
        ? 'Chat is temporarily unavailable. Please try again later.'
        : 'Could not reach the assistant right now. Please try again.';
    return NextResponse.json({ error: message }, { status });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
