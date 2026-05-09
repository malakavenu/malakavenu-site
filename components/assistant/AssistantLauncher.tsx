'use client';

import { useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { useAssistant } from './AssistantContext';

/**
 * Floating bottom-right launcher pill. Persists across the entire site.
 * Fades out while the drawer is open, fades back in when it's closed.
 *
 * Pulses softly on the user's first visit (per-session) to draw the eye —
 * after they've opened the drawer once, the pulse is suppressed.
 */

const ACK_KEY = 'assistant_seen_v1';

// In-process subscriber list so a click on one launcher instance updates any
// other instances on the page (also lets us re-render when storage changes).
const seenListeners = new Set<() => void>();
function subscribeSeen(cb: () => void) {
  seenListeners.add(cb);
  return () => {
    seenListeners.delete(cb);
  };
}
function notifySeen() {
  seenListeners.forEach((cb) => cb());
}
function readSeenSnapshot(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return Boolean(window.sessionStorage.getItem(ACK_KEY));
  } catch {
    return true;
  }
}
function readSeenServerSnapshot(): boolean {
  return true;
}

const noopSubscribe = () => () => {};
function readMacSnapshot(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPad|iPhone/i.test(navigator.platform || '');
}
function readMacServerSnapshot(): boolean {
  return false;
}

export function AssistantLauncher() {
  const { isOpen, open } = useAssistant();
  const pathname = usePathname();
  const seen = useSyncExternalStore(subscribeSeen, readSeenSnapshot, readSeenServerSnapshot);
  const isMac = useSyncExternalStore(noopSubscribe, readMacSnapshot, readMacServerSnapshot);

  // Hide the floating launcher on `/playground`: that page already exposes a
  // dedicated chat tab + "Generate" send button, and on phones the FAB
  // overlapped the bottom-right corner of the result canvas. Users can still
  // open the global drawer with ⌘K / Ctrl+K.
  if (pathname === '/playground') return null;

  function handleClick() {
    try {
      window.sessionStorage.setItem(ACK_KEY, '1');
    } catch {
      // no-op
    }
    notifySeen();
    open({ source: 'launcher' });
  }

  return (
    <>
      <style>{LAUNCHER_CSS}</style>
      <button
        type="button"
        onClick={handleClick}
        aria-label="Ask Malaka — AI assistant"
        className={`asl-fab ${isOpen ? 'asl-fab--hidden' : ''} ${seen ? '' : 'asl-fab--pulse'}`}
      >
        <span aria-hidden="true" className="asl-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </span>
        <span className="asl-label">Ask Malaka</span>
        <kbd className="asl-kbd" aria-hidden="true">
          {isMac ? '⌘K' : 'Ctrl K'}
        </kbd>
      </button>
    </>
  );
}

const LAUNCHER_CSS = `
.asl-fab {
  position: fixed;
  right: 18px;
  bottom: calc(18px + var(--float-bottom-clearance, 0px) + env(safe-area-inset-bottom, 0px));
  z-index: 1060;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px 10px 12px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.15);
  background: var(--grad-primary, linear-gradient(135deg, #7c5cff, #22d3ee));
  color: #fff;
  font-weight: 600;
  font-size: 13.5px;
  letter-spacing: 0.01em;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  box-shadow:
    0 12px 36px rgba(124, 92, 255, 0.35),
    0 4px 10px rgba(0, 0, 0, 0.25);
  transition: transform 200ms var(--ease, cubic-bezier(0.2, 0.8, 0.2, 1)),
              opacity 200ms var(--ease, cubic-bezier(0.2, 0.8, 0.2, 1)),
              box-shadow 200ms var(--ease, cubic-bezier(0.2, 0.8, 0.2, 1));
}
.asl-fab:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}
.asl-fab:hover {
  transform: translateY(-1px) scale(1.02);
  box-shadow:
    0 16px 44px rgba(124, 92, 255, 0.45),
    0 6px 14px rgba(0, 0, 0, 0.3);
}
.asl-fab:active {
  transform: translateY(0) scale(0.99);
}
.asl-fab--hidden {
  opacity: 0;
  pointer-events: none;
  transform: translateY(8px);
}

.asl-icon {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
}

.asl-kbd {
  margin-left: 2px;
  padding: 2px 6px;
  border-radius: 6px;
  background: rgba(0,0,0,0.25);
  border: 1px solid rgba(255,255,255,0.18);
  color: rgba(255,255,255,0.92);
  font-size: 10.5px;
  font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  letter-spacing: 0.04em;
}

@keyframes asl-pulse {
  0%, 100% { box-shadow: 0 12px 36px rgba(124, 92, 255, 0.35), 0 4px 10px rgba(0,0,0,0.25), 0 0 0 0 rgba(124, 92, 255, 0.55); }
  50%      { box-shadow: 0 12px 36px rgba(124, 92, 255, 0.35), 0 4px 10px rgba(0,0,0,0.25), 0 0 0 14px rgba(124, 92, 255, 0); }
}
.asl-fab--pulse {
  animation: asl-pulse 2.4s ease-in-out 1.5s infinite;
}

@media (max-width: 480px) {
  .asl-fab {
    right: 12px;
    bottom: calc(12px + var(--float-bottom-clearance, 0px) + env(safe-area-inset-bottom, 0px));
    padding: 10px 14px;
    font-size: 13px;
    min-height: 44px;
  }
  .asl-kbd { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .asl-fab,
  .asl-fab--pulse {
    animation: none;
    transition: opacity 120ms linear;
  }
  .asl-fab:hover { transform: none; }
}
`;
