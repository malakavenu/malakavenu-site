'use client';

import { useEffect, useRef } from 'react';
import { ChatTab } from '@/components/playground/ChatTab';
import type { AssistantScope } from './AssistantContext';

/**
 * The slide-in drawer that hosts the chat. Right edge on desktop (420px wide),
 * full-screen sheet on mobile. Always renders so the slide animation runs;
 * `aria-hidden` and `pointer-events: none` gate interactivity when closed.
 */

type CloseMethod = 'x' | 'backdrop' | 'esc' | 'cmd_k' | 'programmatic';

type Props = {
  isOpen: boolean;
  scope: AssistantScope;
  prefill: string | null;
  onClose: (method?: CloseMethod) => void;
};

export function AssistantDrawer({ isOpen, scope, prefill, onClose }: Props) {
  const shellRef = useRef<HTMLElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Lock background scroll while the drawer is open.
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  // Manage focus: remember opener, focus first focusable on open, restore on close.
  useEffect(() => {
    if (isOpen) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
      // Defer to ensure the shell is in the DOM tree and the slide-in transition
      // has begun before we move focus.
      const t = window.setTimeout(() => {
        // Prefer focusing the close button so the user knows where they are.
        closeBtnRef.current?.focus();
      }, 50);
      return () => window.clearTimeout(t);
    }
    // On close, return focus to whichever control opened us, if it still exists.
    const prev = previouslyFocusedRef.current;
    if (prev && typeof prev.focus === 'function' && document.contains(prev)) {
      prev.focus();
    }
  }, [isOpen]);

  // Close on Escape and trap Tab focus inside the drawer.
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose('esc');
        return;
      }
      if (e.key !== 'Tab') return;
      const shell = shellRef.current;
      if (!shell) return;
      const focusables = Array.from(
        shell.querySelectorAll<HTMLElement>(
          'a[href], area[href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !shell.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const isArticle = scope.kind === 'article';
  const title = isArticle ? scope.title : 'Ask Malaka';
  const subtitle = isArticle
    ? 'Grounded in this article'
    : 'Grounded in Malaka’s bio and articles';

  // Re-mount ChatTab whenever scope changes by keying on it. This both clears
  // chat history and lets us cleanly re-fire `initialQuery` when the user
  // opens the drawer with a new prefill.
  const chatKey = `${isArticle ? `article:${scope.slug}` : 'site'}:${prefill ?? ''}`;

  return (
    <>
      <style>{ASSISTANT_DRAWER_CSS}</style>

      <button
        type="button"
        className={`asd-overlay ${isOpen ? 'asd-overlay--open' : ''}`}
        onClick={() => onClose('backdrop')}
        aria-label="Close assistant"
        tabIndex={isOpen ? 0 : -1}
        aria-hidden={!isOpen}
      />

      <aside
        ref={shellRef}
        data-assistant-drawer
        className={`asd-shell ${isOpen ? 'asd-shell--open' : ''}`}
        role="dialog"
        aria-modal={isOpen ? 'true' : undefined}
        aria-label={title}
        aria-hidden={!isOpen}
        inert={!isOpen}
      >
        <header className="asd-header">
          <div className="asd-header-text">
            <span className="asd-eyebrow">
              {isArticle ? 'Article assistant' : 'AI assistant'}
            </span>
            <h2 className="asd-title">{title}</h2>
            <p className="asd-subtitle">{subtitle}</p>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            className="asd-close"
            onClick={() => onClose('x')}
            aria-label="Close assistant"
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div className="asd-body">
          <ChatTab
            key={chatKey}
            layout="fill"
            scope={isArticle ? { kind: 'article', slug: scope.slug } : 'site'}
            initialQuery={prefill ?? undefined}
            placeholder={
              isArticle ? `Ask anything about “${scope.title}”…` : 'Ask anything…'
            }
            emptyTitle={title}
            emptyBody={
              isArticle
                ? 'Ask for a summary, a deeper explanation, key takeaways, or counter-arguments.'
                : 'A friendly AI guide grounded in Malaka’s bio and published articles. Pick a starter or type your own question.'
            }
            starters={
              isArticle
                ? [
                    'Summarize this article in 100 words',
                    'What is the main takeaway?',
                    'Give me 3 questions to test if I understood this',
                  ]
                : undefined
            }
          />
        </div>
      </aside>
    </>
  );
}

const ASSISTANT_DRAWER_CSS = `
.asd-overlay {
  position: fixed;
  inset: 0;
  background: rgba(7, 9, 16, 0.55);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  opacity: 0;
  pointer-events: none;
  transition: opacity 220ms var(--ease, cubic-bezier(0.2, 0.8, 0.2, 1));
  /* Above MobileDock (1050), article rail (1055), and launcher (1060). */
  z-index: 1080;
  border: 0;
  padding: 0;
  cursor: pointer;
  appearance: none;
}
.asd-overlay--open {
  opacity: 1;
  pointer-events: auto;
}

.asd-shell {
  position: fixed;
  top: 0;
  right: 0;
  height: 100dvh;
  width: min(440px, 100vw);
  background: var(--bg-1);
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  transform: translateX(100%);
  transition: transform 320ms var(--ease, cubic-bezier(0.2, 0.8, 0.2, 1));
  /* Sits above its own overlay so the chat input bar is never covered by
     MobileDock/launcher/article rail on mobile. */
  z-index: 1090;
  box-shadow: -24px 0 80px rgba(0, 0, 0, 0.4);
}
.asd-shell--open {
  transform: translateX(0);
}

.asd-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 18px 20px 14px;
  border-bottom: 1px solid var(--border);
  background:
    linear-gradient(135deg, rgba(124,92,255,0.10), rgba(34,211,238,0.05));
}
.asd-header-text { flex: 1; min-width: 0; }
.asd-eyebrow {
  display: inline-block;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 4px;
}
.asd-title {
  margin: 0;
  font-size: 17px;
  line-height: 1.25;
  color: var(--text);
  font-weight: 600;
  word-break: break-word;
}
.asd-subtitle {
  margin: 4px 0 0;
  font-size: 12.5px;
  color: var(--text-muted);
}
.asd-close {
  appearance: none;
  width: 36px;
  height: 36px;
  border-radius: 999px;
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--border);
  color: var(--text-soft);
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  transition: background 180ms var(--ease);
}
.asd-close:hover {
  background: rgba(255,255,255,0.08);
}

.asd-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.asd-close:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

@media (max-width: 600px) {
  .asd-shell {
    width: 100vw;
    border-left: none;
    /* respect iOS safe area at top so the title doesn't tuck under notch */
    padding-top: env(safe-area-inset-top, 0px);
  }
  .asd-overlay {
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
  .asd-header {
    padding: 14px 16px 12px;
  }
  .asd-close {
    width: 44px;
    height: 44px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .asd-overlay { transition: none; }
  .asd-shell { transition: none; }
}
`;
