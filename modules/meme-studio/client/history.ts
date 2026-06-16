'use client';

import { useCallback, useSyncExternalStore } from 'react';

export interface MemeHistoryEntry {
  id: string;
  dataUrl: string;
  captionEn: string;
  captionTe: string;
  format: string;
  createdAt: number;
}

const KEY = 'memeStudio.history.v1';
const MAX_ENTRIES = 24;
const EMPTY: MemeHistoryEntry[] = [];

let cache: MemeHistoryEntry[] | null = null;
const listeners = new Set<() => void>();

function read(): MemeHistoryEntry[] {
  if (typeof window === 'undefined') return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as MemeHistoryEntry[];
    return Array.isArray(parsed) ? parsed : EMPTY;
  } catch {
    return EMPTY;
  }
}

function persist(next: MemeHistoryEntry[]): void {
  const bounded = next.slice(0, MAX_ENTRIES);
  cache = bounded;
  if (typeof window !== 'undefined') {
    // PNG data URLs are large; on a quota error, progressively drop the oldest
    // entries and retry so we still persist the most recent memes.
    let attempt = [...bounded];
    while (attempt.length > 0) {
      try {
        window.localStorage.setItem(KEY, JSON.stringify(attempt));
        cache = attempt;
        break;
      } catch {
        attempt = attempt.slice(0, attempt.length - 1);
        if (attempt.length === 0) {
          try {
            window.localStorage.removeItem(KEY);
          } catch {
            // unavailable — keep in-memory cache only
          }
        }
      }
    }
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  if (typeof window !== 'undefined') window.addEventListener('storage', cb);
  return () => {
    listeners.delete(cb);
    if (typeof window !== 'undefined') window.removeEventListener('storage', cb);
  };
}

function getSnapshot(): MemeHistoryEntry[] {
  if (cache === null) cache = read();
  return cache;
}

/** React hook for the persisted meme history (SSR-safe via external store). */
export function useMemeHistory() {
  const entries = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);

  const add = useCallback((entry: Omit<MemeHistoryEntry, 'id' | 'createdAt'>) => {
    const next = [
      { ...entry, id: crypto.randomUUID(), createdAt: Date.now() },
      ...getSnapshot(),
    ].slice(0, MAX_ENTRIES);
    persist(next);
  }, []);

  const remove = useCallback((id: string) => {
    persist(getSnapshot().filter((e) => e.id !== id));
  }, []);

  const clear = useCallback(() => {
    persist([]);
  }, []);

  return { entries, add, remove, clear };
}
