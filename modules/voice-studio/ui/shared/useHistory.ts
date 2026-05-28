'use client';

/**
 * Voice-studio generation history.
 *
 * Persistence model:
 *   - Metadata (id, panel, text, provider, timestamp …) lives in localStorage
 *     so the list survives reloads cheaply.
 *   - The audio Blob is persisted in IndexedDB (see `historyStore`) because
 *     `blob:` URLs created with `URL.createObjectURL` are session-scoped and
 *     die on reload — which is exactly the bug this hook used to ship with.
 *   - On hydration we open every stored Blob and mint a fresh `blob:` URL,
 *     so play / download work in the new session.
 *
 * Failures are non-fatal: if IDB is unavailable (private mode, quota, etc.)
 * the entry is dropped from the visible list instead of rendering a dead
 * play button.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { LanguageCode, PanelId } from '../../types';
import {
  putAudioBlob,
  getAudioBlob,
  deleteAudioBlob,
  clearAudioBlobs,
  urlToBlob,
} from './historyStore';

export interface HistoryEntry {
  id: string;
  timestamp: number;
  panel: PanelId;
  language: LanguageCode;
  text: string;
  /** Session-bound object URL. Always freshly minted; never trust a stored one. */
  audioUrl: string;
  provider: string;
  durationSec?: number;
}

/** Only the small, JSON-safe fields are persisted to localStorage. */
type StoredEntry = Omit<HistoryEntry, 'audioUrl'>;

const STORAGE_KEY = 'voiceStudio.history';
const MAX_ENTRIES = 20;

function readStored(): StoredEntry[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<StoredEntry & { audioUrl?: string }>;
    // Strip any legacy `audioUrl` field — those URLs are dead now.
    return parsed.map(({ audioUrl: _drop, ...rest }) => rest);
  } catch {
    return [];
  }
}

function writeStored(entries: HistoryEntry[]): void {
  if (typeof localStorage === 'undefined') return;
  const stripped: StoredEntry[] = entries.map(({ audioUrl: _drop, ...rest }) => rest);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stripped));
  } catch {
    // Storage full — keep only the most recent half and retry once.
    const trimmed = stripped.slice(-Math.ceil(MAX_ENTRIES / 2));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // Give up silently — the list will just be empty next reload.
    }
  }
}

export function useHistory(panelFilter?: PanelId) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  // Track every object URL we've minted in this session so we can revoke
  // them on unmount / clear to avoid leaking memory.
  const mintedUrlsRef = useRef<Set<string>>(new Set());

  const trackUrl = useCallback((url: string) => {
    mintedUrlsRef.current.add(url);
  }, []);

  const revokeUrl = useCallback((url: string) => {
    if (url.startsWith('blob:')) {
      try { URL.revokeObjectURL(url); } catch { /* ignore */ }
    }
    mintedUrlsRef.current.delete(url);
  }, []);

  // Hydrate from storage on mount. Async because IDB lookups + URL minting
  // need to happen for each entry.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = readStored();
      const restored: HistoryEntry[] = [];
      for (const meta of stored) {
        const blob = await getAudioBlob(meta.id);
        if (cancelled) return;
        if (!blob) continue;
        const url = URL.createObjectURL(blob);
        trackUrl(url);
        restored.push({ ...meta, audioUrl: url });
      }
      if (!cancelled) setEntries(restored);
    })();
    return () => { cancelled = true; };
  }, [trackUrl]);

  // Cleanup: revoke every URL we created when the hook tears down.
  useEffect(() => {
    return () => {
      for (const url of mintedUrlsRef.current) {
        try { URL.revokeObjectURL(url); } catch { /* ignore */ }
      }
      mintedUrlsRef.current.clear();
    };
  }, []);

  const addEntry = useCallback(
    (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => {
      const newEntry: HistoryEntry = {
        ...entry,
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
      };
      trackUrl(newEntry.audioUrl);

      // Fire-and-forget IDB write: pull the bytes from the freshly created
      // object URL and stash them so a future page load can replay this
      // entry.
      void (async () => {
        const blob = await urlToBlob(newEntry.audioUrl);
        if (blob) await putAudioBlob(newEntry.id, blob);
      })();

      setEntries((prev) => {
        const updated = [...prev, newEntry].slice(-MAX_ENTRIES);
        writeStored(updated);
        // Any entries trimmed off the tail also lose their IDB rows so they
        // don't leak forever.
        const keptIds = new Set(updated.map((e) => e.id));
        for (const old of prev) {
          if (!keptIds.has(old.id)) {
            revokeUrl(old.audioUrl);
            void deleteAudioBlob(old.id);
          }
        }
        return updated;
      });
    },
    [trackUrl, revokeUrl]
  );

  const clearHistory = useCallback(() => {
    for (const e of entries) revokeUrl(e.audioUrl);
    setEntries([]);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    void clearAudioBlobs();
  }, [entries, revokeUrl]);

  const filtered = panelFilter
    ? entries.filter((e) => e.panel === panelFilter)
    : entries;

  return { entries: filtered, allEntries: entries, addEntry, clearHistory };
}
