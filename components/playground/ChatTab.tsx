'use client';

import { useEffect, useRef, useState } from 'react';
import { track } from '@/lib/track';
import { Spinner } from './Spinner';
import { MessageContent } from './MessageContent';
import { textareaStyle, chipStyle, subtleNote } from './playgroundStyles';

/**
 * "Ask Malaka" — streaming chat over Pollinations text completions.
 *
 * Reusable beyond /playground: pass `scope` to scope the assistant to a
 * specific article (per-article Q&A on blog posts).
 */

type Message = { role: 'user' | 'assistant'; content: string };

const TEXTAREA_MAX_PX = 140; // ~5 rows of body copy at 14.5px / 1.5 line-height
const INPUT_CHAR_LIMIT = 2000;

type Scope = 'site' | { kind: 'article'; slug: string };

type Props = {
  scope?: Scope;
  starters?: string[];
  placeholder?: string;
  emptyTitle?: string;
  emptyBody?: string;
  /** Fixed-height messages area (used in /playground tab layout). */
  height?: number;
  /** When provided, the chat opens with this query already submitted. */
  initialQuery?: string;
  /**
   * `fixed` (default) — message area is `height` pixels tall, used when
   * embedded in a normal page (e.g. /playground).
   *
   * `fill` — flexbox column that fills its parent height with the input bar
   * pinned to the bottom and starters as a horizontally-scrolling strip above
   * it. Used inside the global Assistant drawer for a true chat-app feel.
   */
  layout?: 'fixed' | 'fill';
};

const DEFAULT_STARTERS = [
  'Tell me about Malaka in one paragraph',
  'What is an MCP server, and which ones has Malaka built?',
  'Recommend an article for a senior frontend engineer learning AI',
  'Is Malaka available for consulting work?',
];

export function ChatTab({
  scope = 'site',
  starters = DEFAULT_STARTERS,
  placeholder = 'Ask anything about Malaka, his work, or his articles…',
  emptyTitle = 'Ask Malaka',
  emptyBody = 'A friendly AI guide grounded in Malaka’s bio and published articles. Pick a starter or type your own question.',
  height = 360,
  initialQuery,
  layout = 'fixed',
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const initialSentRef = useRef(false);

  // Auto-grow the input textarea (1–5 rows worth of content).
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(TEXTAREA_MAX_PX, el.scrollHeight)}px`;
  }, [input]);

  // Smart auto-scroll: only nudge to the bottom if the user is already
  // close to it. If they've scrolled up to re-read an earlier message we
  // leave them alone (and surface a "↓ New" pill below).
  const [isPinnedToBottom, setIsPinnedToBottom] = useState(true);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (isPinnedToBottom) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, streaming, isPinnedToBottom]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setIsPinnedToBottom(distanceFromBottom < 80);
  }

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  useEffect(() => {
    if (!initialQuery || initialSentRef.current) return;
    initialSentRef.current = true;
    void send(initialQuery, 'initial');
    // `send` is stable enough — it reads from refs/state setters only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  async function send(text?: string, source: 'input' | 'starter' | 'initial' = 'input') {
    const content = (text ?? input).trim();
    if (!content || streaming) return;

    setError(null);
    setInput('');
    const next: Message[] = [...messages, { role: 'user', content }];
    setMessages(next);
    setStreaming(true);
    const scopeLabel = typeof scope === 'string' ? scope : 'article';
    const startedAt = performance.now();
    let firstTokenLogged = false;
    track('playground_chat_send', {
      scope: scopeLabel,
      len: content.length,
      source,
      turn: next.filter((m) => m.role === 'user').length,
    });

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, scope }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}) as { error?: string });
        throw new Error(data?.error || `Chat failed (${res.status}).`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      const accum = { buffer: '', text: '' };
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        accum.buffer += decoder.decode(value, { stream: true });

        // Parse OpenAI-style SSE: lines beginning with `data: `, terminated by `\n\n`.
        const events = accum.buffer.split('\n\n');
        accum.buffer = events.pop() ?? '';

        for (const evt of events) {
          for (const line of evt.split('\n')) {
            if (!line.startsWith('data:')) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === '[DONE]') continue;
            try {
              const json = JSON.parse(payload) as {
                choices?: Array<{ delta?: { content?: string }; message?: { content?: string } }>;
              };
              const delta =
                json.choices?.[0]?.delta?.content ??
                json.choices?.[0]?.message?.content ??
                '';
              if (delta) {
                if (!firstTokenLogged) {
                  firstTokenLogged = true;
                  track('playground_chat_first_token', {
                    scope: scopeLabel,
                    ms: Math.round(performance.now() - startedAt),
                  });
                }
                accum.text += delta;
                const snapshot = accum.text;
                setMessages((prev) => {
                  const copy = [...prev];
                  const last = copy[copy.length - 1];
                  if (last && last.role === 'assistant') {
                    copy[copy.length - 1] = { ...last, content: snapshot };
                  }
                  return copy;
                });
              }
            } catch {
              // ignore non-JSON keepalive lines
            }
          }
        }
      }

      track('playground_chat_success', {
        scope: scopeLabel,
        chars: accum.text.length,
        ms: Math.round(performance.now() - startedAt),
      });
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      setError(message);
      setMessages((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last && last.role === 'assistant' && !last.content) copy.pop();
        return copy;
      });
      track('playground_chat_error', { message });
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  function reset() {
    abortRef.current?.abort();
    setMessages([]);
    setInput('');
    setError(null);
  }

  if (layout === 'fill') {
    const lastIdx = messages.length - 1;
    return (
      <>
        <style>{CHAT_FILL_CSS}</style>
        <div className="ct-shell">
          <div ref={scrollRef} className="ct-messages" onScroll={handleScroll}>
            {messages.length === 0 ? (
              <div className="ct-empty">
                <div className="ct-avatar" aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <h3 className="ct-empty-title">{emptyTitle}</h3>
                <p className="ct-empty-body">{emptyBody}</p>
              </div>
            ) : (
              messages.map((m, i) => (
                <Bubble
                  key={i}
                  message={m}
                  streaming={streaming && i === lastIdx && m.role === 'assistant'}
                />
              ))
            )}
            {streaming &&
              messages[messages.length - 1]?.role === 'assistant' &&
              !messages[messages.length - 1]?.content && (
                <div className="ct-typing">
                  <Spinner size={18} label="Thinking" />
                  <span>thinking…</span>
                </div>
              )}
            {error && <div className="ct-error" role="alert">{error}</div>}
          </div>

          {!isPinnedToBottom && messages.length > 0 && (
            <button
              type="button"
              className="ct-jump"
              onClick={() => {
                const el = scrollRef.current;
                if (el) el.scrollTop = el.scrollHeight;
                setIsPinnedToBottom(true);
              }}
              aria-label="Jump to latest message"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="6 9 12 15 18 9" />
              </svg>
              Latest
            </button>
          )}

          <div className="ct-foot">
            {messages.length === 0 && starters.length > 0 && (
              <div
                className="ct-starters"
                role="group"
                aria-label="Suggested questions"
              >
                {starters.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      track('assistant_starter_click', {
                        scope: typeof scope === 'string' ? scope : 'article',
                        index: i,
                        starter: s.slice(0, 80),
                      });
                      void send(s, 'starter');
                    }}
                    disabled={streaming}
                    className="ct-starter"
                    title={s}
                  >
                    {s.length > 64 ? `${s.slice(0, 64)}…` : s}
                  </button>
                ))}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="ct-input-bar"
            >
              {messages.length > 0 && (
                <button
                  type="button"
                  className="ct-icon-btn"
                  onClick={reset}
                  disabled={streaming}
                  title="Start a new chat"
                  aria-label="Start a new chat"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </button>
              )}
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, INPUT_CHAR_LIMIT))}
                placeholder={placeholder}
                rows={1}
                disabled={streaming}
                aria-label="Message"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                className="ct-textarea"
              />
              <button
                type={streaming ? 'button' : 'submit'}
                onClick={streaming ? () => abortRef.current?.abort() : undefined}
                disabled={!streaming && !input.trim()}
                className={`ct-send ${streaming ? 'ct-send--stop' : ''}`}
                aria-label={streaming ? 'Stop generating' : 'Send message'}
                title={streaming ? 'Stop' : 'Send (Enter)'}
              >
                {streaming ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3.4 20.4 21 12 3.4 3.6 3 10l13 2-13 2z" />
                  </svg>
                )}
              </button>
            </form>

            <p className="ct-caveat">
              AI-generated. May be inaccurate.{' '}
              {input.length > 0 && `· ${input.length}/${INPUT_CHAR_LIMIT}`}
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div
        ref={scrollRef}
        style={{
          height,
          overflowY: 'auto',
          padding: 16,
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          background:
            'linear-gradient(135deg, rgba(124,92,255,0.06), rgba(34,211,238,0.04))',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {messages.length === 0 ? (
          <div style={{ margin: 'auto', textAlign: 'center', maxWidth: 420 }}>
            <h3 style={{ margin: '0 0 8px', fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
              {emptyTitle}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6 }}>{emptyBody}</p>
          </div>
        ) : (
          messages.map((m, i) => {
            const isLast = i === messages.length - 1;
            return (
              <Bubble
                key={i}
                message={m}
                streaming={streaming && isLast && m.role === 'assistant'}
              />
            );
          })
        )}
        {streaming && messages[messages.length - 1]?.role === 'assistant' && !messages[messages.length - 1]?.content && (
          <div style={{ alignSelf: 'flex-start', padding: 12 }}>
            <Spinner size={20} label="Assistant typing" />
          </div>
        )}
      </div>

      {messages.length === 0 && starters.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {starters.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                track('assistant_starter_click', {
                  scope: typeof scope === 'string' ? scope : 'article',
                  index: i,
                  starter: s.slice(0, 80),
                });
                void send(s, 'starter');
              }}
              disabled={streaming}
              style={chipStyle}
            >
              {s.length > 56 ? `${s.slice(0, 56)}…` : s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        style={{ display: 'grid', gap: 8 }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value.slice(0, INPUT_CHAR_LIMIT))}
          placeholder={placeholder}
          rows={2}
          disabled={streaming}
          aria-label="Message"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          style={textareaStyle}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
            {input.length}/{INPUT_CHAR_LIMIT} · Enter to send · Shift+Enter for newline
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            {messages.length > 0 && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={reset}
                disabled={streaming}
                style={{ padding: '6px 12px', fontSize: 12 }}
              >
                Clear
              </button>
            )}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!input.trim() || streaming}
              style={{ minWidth: 100 }}
            >
              {streaming ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      </form>

      {error && (
        <p style={{ color: '#fca5a5', fontSize: 13 }}>
          {error}
        </p>
      )}

      <p style={subtleNote}>
        Replies are AI-generated and may be inaccurate. For anything important, use the contact
        form on the home page.
      </p>
    </div>
  );
}

const CHAT_FILL_CSS = `
.ct-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  position: relative;
}
.ct-messages {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 16px 8px;
  scroll-behavior: smooth;
}
.ct-empty {
  margin: auto 0;
  display: grid;
  justify-items: center;
  text-align: center;
  gap: 10px;
  max-width: 360px;
  padding: 24px 8px;
  align-self: center;
}
.ct-avatar {
  width: 48px;
  height: 48px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: var(--grad-primary, linear-gradient(135deg, #7c5cff, #22d3ee));
  color: #fff;
  box-shadow: 0 8px 24px rgba(124, 92, 255, 0.35);
}
.ct-empty-title {
  margin: 4px 0 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
  font-family: var(--font-display, var(--font-space-grotesk, var(--font-inter, sans-serif)));
}
.ct-empty-body {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--text-muted);
}
.ct-typing {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  color: var(--text-muted);
  font-size: 12.5px;
}
.ct-error {
  align-self: stretch;
  background: rgba(252, 165, 165, 0.08);
  border: 1px solid rgba(252, 165, 165, 0.4);
  color: #fca5a5;
  font-size: 13px;
  padding: 10px 12px;
  border-radius: 10px;
}

.ct-foot {
  border-top: 1px solid var(--border);
  background: linear-gradient(180deg, transparent, rgba(0,0,0,0.18));
  padding: 10px 12px max(10px, env(safe-area-inset-bottom));
  display: grid;
  gap: 8px;
}

.ct-starters {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  scroll-snap-type: x proximity;
  padding-bottom: 2px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.ct-starters::-webkit-scrollbar { display: none; }
.ct-starter {
  scroll-snap-align: start;
  flex: 0 0 auto;
  max-width: 80%;
  padding: 7px 12px;
  background: var(--bg-card, rgba(255,255,255,0.03));
  border: 1px solid var(--border);
  color: var(--text-soft);
  border-radius: 999px;
  font-size: 12.5px;
  cursor: pointer;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  transition: background 180ms var(--ease), border-color 180ms var(--ease), color 180ms var(--ease);
}
.ct-starter:hover:not(:disabled) {
  background: rgba(124, 92, 255, 0.08);
  border-color: rgba(124, 92, 255, 0.4);
  color: var(--text);
}
.ct-starter:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.ct-input-bar {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  padding: 6px 6px 6px 10px;
  background: var(--bg-card, rgba(255, 255, 255, 0.04));
  border: 1px solid var(--border);
  border-radius: 22px;
  transition: border-color 200ms var(--ease), box-shadow 200ms var(--ease);
}
.ct-input-bar:focus-within {
  border-color: rgba(124, 92, 255, 0.55);
  box-shadow: 0 0 0 3px rgba(124, 92, 255, 0.18);
}

.ct-textarea {
  flex: 1;
  min-width: 0;
  padding: 8px 4px;
  background: transparent;
  color: var(--text);
  border: none;
  outline: none;
  resize: none;
  font: inherit;
  /* 16px+ avoids iOS Safari auto-zoom on focus */
  font-size: 16px;
  line-height: 1.5;
  max-height: 140px;
}
@media (min-width: 600px) {
  .ct-textarea { font-size: 14.5px; }
}
.ct-textarea::placeholder {
  color: var(--text-muted);
}
.ct-textarea:disabled {
  opacity: 0.7;
}

.ct-icon-btn {
  appearance: none;
  width: 36px;
  height: 36px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-soft);
  cursor: pointer;
  flex-shrink: 0;
  transition: background 180ms var(--ease), color 180ms var(--ease);
  -webkit-tap-highlight-color: transparent;
}
.ct-icon-btn:focus-visible,
.ct-send:focus-visible,
.ct-starter:focus-visible {
  outline: 2px solid var(--accent, #7c5cff);
  outline-offset: 2px;
}
.ct-icon-btn:hover:not(:disabled) {
  background: rgba(255,255,255,0.04);
  color: var(--text);
}
.ct-icon-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.ct-send {
  appearance: none;
  width: 36px;
  height: 36px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: var(--grad-primary, linear-gradient(135deg, #7c5cff, #22d3ee));
  border: none;
  color: #fff;
  cursor: pointer;
  flex-shrink: 0;
  transition: transform 180ms var(--ease), opacity 180ms var(--ease);
  box-shadow: 0 4px 14px rgba(124, 92, 255, 0.35);
}
.ct-send:hover:not(:disabled) { transform: scale(1.04); }
.ct-send:active:not(:disabled) { transform: scale(0.97); }
.ct-send:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  box-shadow: none;
}
.ct-send--stop {
  background: linear-gradient(135deg, #f43f5e, #f97316);
  box-shadow: 0 4px 14px rgba(244, 63, 94, 0.35);
}

.ct-caveat {
  margin: 0;
  text-align: center;
  font-size: 11px;
  color: var(--text-muted);
  letter-spacing: 0.02em;
}

/* ───────────── Message bubbles ───────────── */
.bub {
  display: flex;
  flex-direction: column;
  position: relative;
  word-break: break-word;
}
.bub--user {
  align-self: flex-end;
  max-width: 85%;
}
.bub-user-bubble {
  background: var(--grad-primary, linear-gradient(135deg, #7c5cff, #22d3ee));
  color: #fff;
  padding: 10px 14px;
  border-radius: 18px 18px 4px 18px;
  font-size: 14.5px;
  line-height: 1.55;
  white-space: pre-wrap;
  box-shadow: 0 4px 14px rgba(124, 92, 255, 0.18);
}
.bub--assistant {
  align-self: stretch;
  max-width: 100%;
  padding: 2px 2px 14px;
}
.bub-placeholder {
  color: var(--text-muted);
  font-size: 14.5px;
}
.bub-caret {
  display: inline-block;
  width: 8px;
  height: 1em;
  margin-left: 2px;
  vertical-align: -0.15em;
  background: currentColor;
  opacity: 0.7;
  animation: bub-blink 1s steps(2, start) infinite;
}
@keyframes bub-blink {
  to { visibility: hidden; }
}
@media (prefers-reduced-motion: reduce) {
  .bub-caret { animation: none; opacity: 0.6; }
}

.bub-toolbar {
  display: flex;
  gap: 6px;
  margin-top: 6px;
  opacity: 0;
  transform: translateY(-2px);
  transition: opacity 160ms var(--ease), transform 160ms var(--ease);
}
.bub:hover .bub-toolbar,
.bub:focus-within .bub-toolbar {
  opacity: 1;
  transform: translateY(0);
}
.bub-tool {
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 999px;
  color: var(--text-muted);
  font-size: 11.5px;
  cursor: pointer;
  transition: background 160ms var(--ease), color 160ms var(--ease);
}
.bub-tool:hover {
  background: rgba(255,255,255,0.04);
  color: var(--text);
}
.bub-tool:focus-visible {
  outline: 2px solid var(--accent, #7c5cff);
  outline-offset: 2px;
}

/* ───────────── Markdown content (.mc-*) ─────────────
   Scoped under .mc so nothing leaks into the rest of the site. */
.mc {
  font-size: 14.5px;
  line-height: 1.65;
  color: var(--text);
}
.mc > :first-child { margin-top: 0; }
.mc > :last-child  { margin-bottom: 0; }

.mc p {
  margin: 0 0 10px;
}
.mc strong { color: var(--text); font-weight: 650; }
.mc em { font-style: italic; }
.mc del { opacity: 0.65; }

.mc h1, .mc h2, .mc h3, .mc h4, .mc h5, .mc h6 {
  margin: 18px 0 8px;
  font-family: var(--font-display, var(--font-space-grotesk, inherit));
  color: var(--text);
  font-weight: 650;
  line-height: 1.3;
}
.mc h1 { font-size: 1.35em; }
.mc h2 { font-size: 1.2em; }
.mc h3 { font-size: 1.08em; }
.mc h4 { font-size: 1em; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-soft); }

.mc ul, .mc ol {
  margin: 0 0 10px;
  padding-left: 1.4em;
}
.mc ul { list-style: disc; }
.mc ol { list-style: decimal; }
.mc li { margin: 2px 0; }
.mc li > p { margin: 0 0 4px; }
.mc li::marker { color: var(--text-muted); }
.mc input[type="checkbox"] {
  margin-right: 6px;
  accent-color: var(--accent, #7c5cff);
}

.mc blockquote {
  margin: 10px 0;
  padding: 4px 0 4px 12px;
  border-left: 3px solid var(--accent, #7c5cff);
  color: var(--text-soft);
  font-style: italic;
}
.mc blockquote p:last-child { margin-bottom: 0; }

.mc hr {
  border: 0;
  border-top: 1px solid var(--border);
  margin: 14px 0;
}

.mc-link {
  color: var(--accent, #7c5cff);
  text-decoration: underline;
  text-underline-offset: 2px;
  text-decoration-thickness: 1px;
  word-break: break-word;
}
.mc-link:hover {
  text-decoration-thickness: 2px;
}

.mc-inline-code {
  font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 0.88em;
  background: var(--bg-card, rgba(255,255,255,0.06));
  border: 1px solid var(--border);
  padding: 1px 6px;
  border-radius: 6px;
  white-space: nowrap;
}

.mc table {
  display: block;
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  border-collapse: collapse;
  margin: 10px 0;
  font-size: 13.5px;
}
.mc thead { background: rgba(255,255,255,0.03); }
.mc th, .mc td {
  border: 1px solid var(--border);
  padding: 6px 10px;
  text-align: left;
  vertical-align: top;
}
.mc th { font-weight: 600; color: var(--text); }

/* ───────────── Code block (.cb-*) ───────────── */
.cb {
  margin: 12px 0;
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  background: #1c1f26;  /* matches github-dark-dimmed surface */
  font-size: 13px;
}
.cb-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px 6px 14px;
  background: rgba(255,255,255,0.04);
  border-bottom: 1px solid var(--border);
  font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 11.5px;
  color: var(--text-muted);
  letter-spacing: 0.02em;
}
.cb-lang {
  text-transform: lowercase;
}
.cb-copy {
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  color: var(--text-muted);
  font: inherit;
  font-size: 11.5px;
  cursor: pointer;
  transition: background 160ms var(--ease), color 160ms var(--ease), border-color 160ms var(--ease);
}
.cb-copy:hover {
  background: rgba(255,255,255,0.06);
  color: var(--text);
  border-color: var(--border);
}
.cb-copy:focus-visible {
  outline: 2px solid var(--accent, #7c5cff);
  outline-offset: 2px;
}
.cb-body {
  margin: 0;
  padding: 12px 14px;
  overflow-x: auto;
  font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  line-height: 1.55;
  -webkit-overflow-scrolling: touch;
}
.cb-body--plain {
  color: #d6e1ea;
  white-space: pre;
}
.cb-body--shiki :global(pre) {
  margin: 0;
  background: transparent !important;
}
/* Shiki output uses inline color styles; just neutralise its own padding. */
.cb-body--shiki pre {
  margin: 0;
  background: transparent !important;
  padding: 0 !important;
}
.cb-body--shiki code {
  background: transparent;
  padding: 0;
  font-size: inherit;
  white-space: pre;
}

/* ───────────── Jump-to-latest pill ───────────── */
.ct-jump {
  position: absolute;
  left: 50%;
  bottom: 96px;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px;
  background: var(--bg-card, rgba(20, 22, 30, 0.92));
  border: 1px solid var(--border);
  color: var(--text);
  font-size: 12px;
  border-radius: 999px;
  cursor: pointer;
  box-shadow: 0 6px 18px rgba(0,0,0,0.3);
  z-index: 2;
  transition: background 160ms var(--ease);
}
.ct-jump:hover { background: rgba(255,255,255,0.05); }
.ct-jump:focus-visible {
  outline: 2px solid var(--accent, #7c5cff);
  outline-offset: 2px;
}
`;

function Bubble({
  message,
  streaming = false,
}: {
  message: Message;
  streaming?: boolean;
}) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      // clipboard blocked — silent
    }
  }

  if (isUser) {
    return (
      <div className="bub bub--user">
        <div className="bub-user-bubble">{message.content || '…'}</div>
      </div>
    );
  }

  // Assistant message — full-width, no bubble chrome (desktop). On
  // narrow viewports the parent `.ct-messages` already constrains width,
  // so we don't need to swap layouts; the typography styles handle
  // mobile readability via clamp/line-height.
  return (
    <div className="bub bub--assistant">
      {message.content ? (
        <MessageContent content={message.content} streaming={streaming} />
      ) : (
        <span className="bub-placeholder">…</span>
      )}
      {streaming && message.content && <span className="bub-caret" aria-hidden="true" />}
      {!streaming && message.content && (
        <div className="bub-toolbar">
          <button
            type="button"
            className="bub-tool"
            onClick={copy}
            aria-label={copied ? 'Copied' : 'Copy reply'}
            title={copied ? 'Copied' : 'Copy reply'}
          >
            {copied ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            )}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      )}
    </div>
  );
}
