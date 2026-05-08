'use client';

import { useEffect, useRef, useState } from 'react';
import { track } from '@/lib/track';
import { Spinner } from './Spinner';
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

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, streaming]);

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
    return (
      <>
        <style>{CHAT_FILL_CSS}</style>
        <div className="ct-shell">
          <div ref={scrollRef} className="ct-messages">
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
              messages.map((m, i) => <Bubble key={i} message={m} />)
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
          messages.map((m, i) => <Bubble key={i} message={m} />)
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
`;

function Bubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  return (
    <div
      style={{
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        maxWidth: '85%',
        background: isUser ? 'var(--grad-primary)' : 'var(--bg-card)',
        color: isUser ? '#fff' : 'var(--text)',
        border: isUser ? 'none' : '1px solid var(--border)',
        padding: '10px 14px',
        borderRadius: 'var(--radius-md)',
        fontSize: 14.5,
        lineHeight: 1.55,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {message.content || '…'}
    </div>
  );
}
