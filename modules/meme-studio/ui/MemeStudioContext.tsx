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
import type {
  Language,
  LeaderFace,
  MemeAsset,
  MemeConcept,
  MemeStudioConfig,
  MemeTone,
  TargetParty,
  TranscriptResult,
} from '../types';
import { loadFaceManifest } from '../data/faces';
import { loadAssetManifest } from '../data/assets';

/** Render status of a concept's auto-composed meme image. */
export type RenderState =
  | { status: 'idle' }
  | { status: 'rendering' }
  | { status: 'ready'; dataUrl: string }
  | { status: 'error'; error: string };

interface MemeStudioState {
  config: MemeStudioConfig;
  transcript: TranscriptResult | null;
  setTranscript: (t: TranscriptResult | null) => void;
  concepts: MemeConcept[];
  setConcepts: (c: MemeConcept[]) => void;
  activeConcept: MemeConcept | null;
  setActiveConcept: (c: MemeConcept | null) => void;
  language: Language | 'both';
  setLanguage: (l: Language | 'both') => void;
  target: TargetParty;
  setTarget: (t: TargetParty) => void;
  tone: MemeTone;
  setTone: (t: MemeTone) => void;
  faces: LeaderFace[];
  assets: MemeAsset[];
  reloadLibrary: () => void;
  lastProvider: string | null;
  setLastProvider: (p: string | null) => void;
  /** Per-concept rendered-meme cache. */
  renders: Record<string, RenderState>;
  setRender: (conceptId: string, state: RenderState) => void;
  clearRenders: () => void;
}

const Ctx = createContext<MemeStudioState | null>(null);

export function MemeStudioProvider({
  config,
  children,
}: {
  config: MemeStudioConfig;
  children: ReactNode;
}) {
  const [transcript, setTranscript] = useState<TranscriptResult | null>(null);
  const [concepts, setConceptsRaw] = useState<MemeConcept[]>([]);
  const [activeConcept, setActiveConcept] = useState<MemeConcept | null>(null);
  const [language, setLanguage] = useState<Language | 'both'>(config.defaultLanguage);
  const [target, setTarget] = useState<TargetParty>(config.defaultTarget);
  const [tone, setTone] = useState<MemeTone>('satirical');
  const [faces, setFaces] = useState<LeaderFace[]>([]);
  const [assets, setAssets] = useState<MemeAsset[]>([]);
  const [lastProvider, setLastProvider] = useState<string | null>(null);
  const [libNonce, setLibNonce] = useState(0);
  const [renders, setRenders] = useState<Record<string, RenderState>>({});

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      loadFaceManifest(config.basePath),
      loadAssetManifest(config.basePath),
    ])
      .then(([f, a]) => {
        if (cancelled) return;
        setFaces(f);
        setAssets(a);
      })
      .catch(() => {
        // Library is optional — memes still render with placeholders. Leave
        // faces/assets empty rather than crashing the app on a manifest miss.
        if (cancelled) return;
        setFaces([]);
        setAssets([]);
      });
    return () => {
      cancelled = true;
    };
  }, [config.basePath, libNonce]);

  const setConcepts = useCallback((next: MemeConcept[]) => {
    setConceptsRaw(next);
    // New concepts → drop any stale renders for ids no longer present.
    setRenders((prev) => {
      const keep: Record<string, RenderState> = {};
      const ids = new Set(next.map((c) => c.id));
      for (const [k, v] of Object.entries(prev)) if (ids.has(k)) keep[k] = v;
      return keep;
    });
  }, []);

  const setRender = useCallback((conceptId: string, state: RenderState) => {
    setRenders((prev) => ({ ...prev, [conceptId]: state }));
  }, []);

  const clearRenders = useCallback(() => setRenders({}), []);

  const value = useMemo<MemeStudioState>(
    () => ({
      config,
      transcript,
      setTranscript,
      concepts,
      setConcepts,
      activeConcept,
      setActiveConcept,
      language,
      setLanguage,
      target,
      setTarget,
      tone,
      setTone,
      faces,
      assets,
      reloadLibrary: () => setLibNonce((n) => n + 1),
      lastProvider,
      setLastProvider,
      renders,
      setRender,
      clearRenders,
    }),
    [
      config,
      transcript,
      concepts,
      setConcepts,
      activeConcept,
      language,
      target,
      tone,
      faces,
      assets,
      lastProvider,
      renders,
      setRender,
      clearRenders,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMemeStudio(): MemeStudioState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useMemeStudio must be used inside <MemeStudioProvider>');
  return ctx;
}
