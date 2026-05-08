'use client';

import { useEffect, useState } from 'react';
import { useAssistant } from './AssistantContext';
import { useArticleTTS } from './useArticleTTS';

/**
 * Sticky reading rail for article pages. Replaces the old footer-block
 * `<ArticleAssistant>`. Provides two pill buttons:
 *
 *   ▶︎ / ⏸  Listen — TTS playback for the article
 *   💬     Ask    — opens the global assistant drawer scoped to this article
 *
 * Appears once the user has scrolled past the article hero (≥ 320px) and
 * follows them down the page. On mobile it docks to the bottom-left so it
 * doesn't overlap the global launcher in the bottom-right.
 */

type Props = {
  slug: string;
  title: string;
  speakable: string;
};

const SCROLL_REVEAL_PX = 320;

export function ArticleReadingRail({ slug, title, speakable }: Props) {
  const [visible, setVisible] = useState(false);
  const { open } = useAssistant();
  const { status, error, toggle } = useArticleTTS({ slug, title, speakable });

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > SCROLL_REVEAL_PX);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function handleAsk() {
    open({
      scope: { kind: 'article', slug, title },
      source: 'article_rail',
    });
  }

  const playing = status === 'playing';
  const loading = status === 'loading';
  const listenLabel = loading ? 'Loading…' : playing ? 'Pause' : 'Listen';
  const listenAria = loading
    ? 'Loading audio'
    : playing
    ? 'Pause article audio'
    : 'Listen to this article';

  return (
    <>
      <style>{RAIL_CSS}</style>
      <div
        className={`arr-rail ${visible ? 'arr-rail--visible' : ''}`}
        role="toolbar"
        aria-label="Article tools"
      >
        <button
          type="button"
          className={`arr-btn ${playing ? 'arr-btn--active' : ''}`}
          onClick={toggle}
          disabled={loading}
          aria-pressed={playing}
          aria-label={listenAria}
          title={listenAria}
        >
          <span aria-hidden="true" className="arr-icon">
            {loading ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="arr-spin">
                <path d="M21 12a9 9 0 1 1-6.2-8.55" />
              </svg>
            ) : playing ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </span>
          <span className="arr-lbl">{listenLabel}</span>
        </button>

        <button
          type="button"
          className="arr-btn"
          onClick={handleAsk}
          aria-label="Ask about this article"
          title="Ask about this article"
        >
          <span aria-hidden="true" className="arr-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </span>
          <span className="arr-lbl">Ask</span>
        </button>
      </div>
      {visible && error && (
        <div className="arr-error" role="alert">
          {error}
        </div>
      )}
    </>
  );
}

const RAIL_CSS = `
.arr-rail {
  position: fixed;
  left: 18px;
  bottom: calc(18px + var(--float-bottom-clearance, 0px) + env(safe-area-inset-bottom, 0px));
  z-index: 1055;
  display: flex;
  flex-direction: row;
  gap: 6px;
  background: rgba(11, 13, 20, 0.78);
  backdrop-filter: blur(14px) saturate(140%);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
  border: 1px solid var(--border, rgba(255,255,255,0.10));
  border-radius: 999px;
  padding: 5px;
  opacity: 0;
  transform: translateY(8px);
  pointer-events: none;
  transition: opacity 240ms var(--ease, cubic-bezier(0.2, 0.8, 0.2, 1)),
              transform 240ms var(--ease, cubic-bezier(0.2, 0.8, 0.2, 1));
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.32);
}
.arr-rail--visible {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.arr-btn {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  /* Touch-target: WCAG / Apple HIG recommend 44px min on touch. */
  min-height: 44px;
  min-width: 44px;
  padding: 6px 14px 6px 10px;
  border-radius: 999px;
  background: transparent;
  border: none;
  color: var(--text-soft, #cbd5e1);
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition: background 180ms var(--ease), color 180ms var(--ease);
  -webkit-tap-highlight-color: transparent;
}
.arr-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text, #fff);
}
.arr-btn:focus-visible {
  outline: 2px solid var(--accent, #7c5cff);
  outline-offset: 2px;
}
.arr-btn:disabled {
  opacity: 0.7;
  cursor: progress;
}
.arr-btn--active {
  background: var(--grad-primary, linear-gradient(135deg, #7c5cff, #22d3ee));
  color: #fff;
}
.arr-icon { display: grid; place-items: center; }

@keyframes arr-spin {
  to { transform: rotate(360deg); }
}
.arr-spin { animation: arr-spin 0.8s linear infinite; transform-origin: 50% 50%; }

.arr-error {
  position: fixed;
  left: 18px;
  bottom: calc(70px + var(--float-bottom-clearance, 0px) + env(safe-area-inset-bottom, 0px));
  z-index: 1054;
  max-width: min(320px, calc(100vw - 36px));
  background: rgba(220, 38, 38, 0.92);
  color: #fff;
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 12.5px;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.3);
}

@media (min-width: 1100px) {
  .arr-rail {
    left: auto;
    right: 18px;
    bottom: calc(86px + var(--float-bottom-clearance, 0px));
    flex-direction: column;
    gap: 4px;
    border-radius: 18px;
    padding: 6px;
  }
  .arr-btn {
    padding: 8px 12px 8px 10px;
    border-radius: 12px;
  }
  .arr-error {
    left: auto;
    right: 18px;
    bottom: calc(170px + var(--float-bottom-clearance, 0px));
  }
}

@media (max-width: 480px) {
  .arr-rail {
    left: 12px;
    bottom: calc(12px + var(--float-bottom-clearance, 0px) + env(safe-area-inset-bottom, 0px));
    padding: 4px;
  }
  .arr-lbl { display: none; }
  .arr-btn {
    padding: 0;
  }
  .arr-error {
    left: 12px;
    bottom: calc(64px + var(--float-bottom-clearance, 0px) + env(safe-area-inset-bottom, 0px));
  }
}

@media (prefers-reduced-motion: reduce) {
  .arr-rail { transition: none; }
  .arr-spin { animation: none; }
}
`;
