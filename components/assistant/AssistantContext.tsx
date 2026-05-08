'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { track } from '@/lib/track';
import { AssistantDrawer } from './AssistantDrawer';

/**
 * Site-wide AI assistant orchestration.
 *
 * Exposes a single `useAssistant()` hook that any component can call to open
 * the drawer, optionally scoped to a specific article and optionally with a
 * pre-filled query that auto-sends. Also wires the global ⌘K / Ctrl+K
 * keyboard shortcut.
 */

export type AssistantScope =
  | { kind: 'site' }
  | { kind: 'article'; slug: string; title: string };

type OpenArgs = {
  scope?: AssistantScope;
  prefill?: string;
  source?: string;
};

type CloseMethod = 'x' | 'backdrop' | 'esc' | 'cmd_k' | 'programmatic';

type AssistantContextValue = {
  isOpen: boolean;
  scope: AssistantScope;
  prefill: string | null;
  open: (args?: OpenArgs) => void;
  close: (method?: CloseMethod) => void;
  toggle: () => void;
};

const AssistantContext = createContext<AssistantContextValue | null>(null);

const DEFAULT_SCOPE: AssistantScope = { kind: 'site' };

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [scope, setScope] = useState<AssistantScope>(DEFAULT_SCOPE);
  const [prefill, setPrefill] = useState<string | null>(null);

  const open = useCallback((args: OpenArgs = {}) => {
    if (args.scope) setScope(args.scope);
    setPrefill(args.prefill ?? null);
    setIsOpen(true);
    track('assistant_open', {
      scope: args.scope?.kind ?? 'site',
      slug: args.scope?.kind === 'article' ? args.scope.slug : undefined,
      source: args.source ?? 'unknown',
      prefilled: Boolean(args.prefill),
    });
  }, []);

  const close = useCallback((method: CloseMethod = 'programmatic') => {
    setIsOpen((wasOpen) => {
      if (wasOpen) {
        track('assistant_close', {
          method,
          scope: scope.kind,
          slug: scope.kind === 'article' ? scope.slug : undefined,
        });
      }
      return false;
    });
    setPrefill(null);
  }, [scope]);

  const toggle = useCallback(() => {
    setIsOpen((cur) => !cur);
  }, []);

  // Global ⌘K / Ctrl+K shortcut. Toggles the drawer from anywhere in the app,
  // including from focused inputs (standard global-palette pattern). The one
  // exception: when the user is already typing inside the drawer's own
  // textarea, we let the keystroke pass through so it doesn't hijack typing.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isModK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
      if (!isModK) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-assistant-drawer]')) return;
      e.preventDefault();
      setIsOpen((cur) => {
        const next = !cur;
        if (next) {
          track('assistant_open', { scope: 'site', source: 'cmd_k' });
        } else {
          track('assistant_close', { method: 'cmd_k', scope: 'site' });
          setPrefill(null);
        }
        return next;
      });
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const value = useMemo<AssistantContextValue>(
    () => ({ isOpen, scope, prefill, open, close, toggle }),
    [isOpen, scope, prefill, open, close, toggle],
  );

  return (
    <AssistantContext.Provider value={value}>
      {children}
      <AssistantDrawer
        isOpen={isOpen}
        scope={scope}
        prefill={prefill}
        onClose={close}
      />
    </AssistantContext.Provider>
  );
}

export function useAssistant(): AssistantContextValue {
  const ctx = useContext(AssistantContext);
  if (!ctx) {
    throw new Error('useAssistant() must be used inside <AssistantProvider>.');
  }
  return ctx;
}
