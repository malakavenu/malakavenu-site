'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { track } from '@/lib/track';

const MODELS = [
  {
    id: 'flux',
    label: 'Flux',
    tag: 'Balanced · default',
    badge: 'Best mix',
  },
  {
    id: 'gptimage-2',
    label: 'GPT-Image 2',
    tag: 'High quality · slower',
    badge: undefined,
  },
  {
    id: 'seedream',
    label: 'Seedream',
    tag: 'Stylised · artistic',
    badge: undefined,
  },
  {
    id: 'turbo',
    label: 'Turbo',
    tag: 'Fastest · drafty',
    badge: 'Speedy',
  },
] as const;

type ModelId = (typeof MODELS)[number]['id'];

const COUNT_OPTIONS = [
  { value: 1 as const, label: '1 image' },
  { value: 4 as const, label: '4 variations' },
];

// Aspect ratios — chosen to match common end-uses without making the
// picker overwhelming. The API accepts arbitrary width/height (clamped to
// 256–1536) so we pre-pick safe values that look great in each shape.
const ASPECTS = [
  {
    id: 'square' as const,
    label: 'Square',
    hint: 'Posts · avatars',
    width: 1024,
    height: 1024,
  },
  {
    id: 'portrait' as const,
    label: 'Portrait',
    hint: 'Phones · stories',
    width: 768,
    height: 1280,
  },
  {
    id: 'landscape' as const,
    label: 'Landscape',
    hint: 'Headers · wallpapers',
    width: 1280,
    height: 768,
  },
];
type AspectId = (typeof ASPECTS)[number]['id'];

type Sample = {
  emoji: string;
  tag: string;
  prompt: string;
};

const SAMPLES: Sample[] = [
  {
    emoji: '🎬',
    tag: 'Cinematic',
    prompt:
      'A cinematic portrait of an Indian software architect at a glass desk in Bangalore, neon city lights through floor-to-ceiling windows, depth of field, photoreal, 35mm',
  },
  {
    emoji: '🤖',
    tag: 'Agentic AI',
    prompt:
      'Isometric illustration of a multi-agent AI system, glowing nodes connected by violet and cyan light trails, dark background, ultra-detailed, vector',
  },
  {
    emoji: '🎨',
    tag: 'Brand banner',
    prompt:
      'A minimal product banner for an AI engineering portfolio: gradient mesh of violet, cyan and pink, soft grain, abstract shapes, premium magazine style',
  },
  {
    emoji: '🦊',
    tag: 'Mascot',
    prompt:
      'A friendly mascot for a developer blog, flat vector, holding a laptop emitting sparkling code, pastel violet and cyan palette, sticker style',
  },
  {
    emoji: '🌆',
    tag: 'Place',
    prompt:
      'Wide-angle aerial shot of Bangalore at golden hour, palm trees and tech towers glowing, soft haze, photoreal, drone photography, 24mm',
  },
  {
    emoji: '🧪',
    tag: 'Concept',
    prompt:
      'Concept art of a futuristic command palette UI floating above a developer’s desk, holographic violet panels, soft particle dust, cinematic lighting',
  },
  {
    emoji: '📚',
    tag: 'Editorial',
    prompt:
      'Editorial illustration about MCP servers and agent skills — abstract gears, glowing tokens flowing through pipes, magenta-cyan palette, paper-cut style',
  },
  {
    emoji: '✨',
    tag: 'Dreamy',
    prompt:
      'Surreal dreamscape: a giant prompt window floating in the clouds, code rain, soft pastel sunset, anime concept art, ultra wide',
  },
];

const MAX_PROMPT = 500;

// Rotating placeholder copy — shown in the textarea when it's empty so the
// page doesn't feel static. Skipped automatically when prefers-reduced-motion.
const PLACEHOLDER_HINTS = [
  'A cinematic portrait of a frontend architect surrounded by glowing AI agents…',
  'Isometric scene of MCP servers passing tools across a violet-cyan circuit grid…',
  'Editorial illustration: prompts flowing through pipes, paper-cut style…',
  'Wide-angle Bangalore skyline at golden hour, palm trees, drone shot, 24mm…',
  'A friendly mascot robot reading a code journal, pastel sticker style…',
  'Surreal dreamscape: a giant prompt window floating in clouds, anime art…',
];

// One-tap creative refinements appended to the current prompt. Saves users
// from having to remember the right vocabulary while teaching prompt-craft.
const STYLE_MODIFIERS: Array<{ label: string; emoji: string; append: string }> = [
  { label: 'Cinematic', emoji: '🎬', append: 'cinematic, dramatic lighting, 35mm' },
  { label: 'Photoreal', emoji: '📷', append: 'photoreal, ultra detailed, depth of field' },
  { label: 'Neon noir', emoji: '🌃', append: 'neon noir, rain-slick streets, magenta and cyan rim light' },
  { label: 'Vector flat', emoji: '🟣', append: 'flat vector illustration, minimal, soft shadows' },
  { label: 'Anime', emoji: '🌸', append: 'anime concept art, soft cel shading' },
  { label: 'Studio Ghibli', emoji: '🍃', append: 'studio ghibli style, painterly, golden hour' },
  { label: 'Paper-cut', emoji: '📄', append: 'paper-cut illustration, layered, soft grain' },
  { label: '3D render', emoji: '🧊', append: 'octane render, soft glow, glossy materials' },
];

const RECENT_KEY = 'pg:recent:v1';
const RECENT_MAX = 6;
type RecentEntry = { prompt: string; model: ModelId; ts: number };

// ---- Web Speech API: minimal types + feature detection ----
// SpeechRecognition isn't in lib.dom.d.ts, so we declare just enough
// of the surface we use. The runtime constructor is feature-detected
// from the standard and -webkit prefixed globals.
type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: { transcript: string };
};
type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};
type SpeechRecognitionErrorLike = { error: string };
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: ((e: Event) => void) | null;
  onerror: ((e: SpeechRecognitionErrorLike) => void) | null;
  onend: ((e: Event) => void) | null;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// Voice support is read via useSyncExternalStore so we don't trigger the
// react-hooks/set-state-in-effect rule and so SSR returns a stable `false`
// (preventing a hydration mismatch on browsers that lack the API).
const noopUnsub = () => undefined;
function subscribeVoiceSupport(): () => void {
  return noopUnsub;
}
function getVoiceSupportClient(): boolean {
  return getSpeechRecognitionCtor() !== null;
}
function getVoiceSupportServer(): boolean {
  return false;
}

// ---- localStorage-backed recent-prompts store ----
// Implemented as a tiny external store so the React hook can use
// `useSyncExternalStore` instead of an effect that calls setState
// (which is now flagged by react-hooks/set-state-in-effect).
const RECENT_EMPTY: RecentEntry[] = [];
let recentCachedRaw: string | null | undefined;
let recentCachedValue: RecentEntry[] = RECENT_EMPTY;
const recentListeners = new Set<() => void>();

function getRecentSnapshot(): RecentEntry[] {
  if (typeof window === 'undefined') return RECENT_EMPTY;
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (raw === recentCachedRaw) return recentCachedValue;
    recentCachedRaw = raw;
    if (!raw) {
      recentCachedValue = RECENT_EMPTY;
      return recentCachedValue;
    }
    const parsed = JSON.parse(raw) as RecentEntry[];
    recentCachedValue = Array.isArray(parsed) ? parsed.slice(0, RECENT_MAX) : RECENT_EMPTY;
    return recentCachedValue;
  } catch {
    recentCachedValue = RECENT_EMPTY;
    return recentCachedValue;
  }
}

function getRecentServerSnapshot(): RecentEntry[] {
  return RECENT_EMPTY;
}

function subscribeRecent(cb: () => void) {
  recentListeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === RECENT_KEY) cb();
  };
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage);
  return () => {
    recentListeners.delete(cb);
    if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
  };
}

function writeRecent(next: RecentEntry[]) {
  recentCachedValue = next;
  try {
    const raw = JSON.stringify(next);
    recentCachedRaw = raw;
    window.localStorage.setItem(RECENT_KEY, raw);
  } catch {
    /* quota / private mode — non-fatal, keep in-memory state */
  }
  recentListeners.forEach((cb) => cb());
}

type GenStatus = 'idle' | 'enhancing' | 'generating' | 'done' | 'error';

type GeneratedImage = { url: string; seed: number; provider: string; filename: string };

type GenerateTabProps = {
  /**
   * Hand the currently visible image off to the Edit tab. When supplied,
   * an "Edit this →" button appears in the result toolbar and lightbox.
   */
  onUseInEdit?: (file: File) => void;
};

export function GenerateTab({ onUseInEdit }: GenerateTabProps = {}) {
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState<ModelId>('flux');
  const [aspect, setAspect] = useState<AspectId>('square');
  const [count, setCount] = useState<1 | 4>(1);
  const [status, setStatus] = useState<GenStatus>('idle');
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ ms: number; provider: string; model: string } | null>(null);

  const objectUrlsRef = useRef<string[]>([]);
  const canvasRef = useRef<HTMLDivElement>(null);

  // ---- Animated cycling placeholder ----
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  useEffect(() => {
    if (prompt.length > 0) return;
    if (typeof window === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % PLACEHOLDER_HINTS.length);
    }, 4200);
    return () => window.clearInterval(id);
  }, [prompt.length]);

  // ---- Recent prompts: subscribed to a localStorage-backed external store ----
  const recent = useSyncExternalStore(
    subscribeRecent,
    getRecentSnapshot,
    getRecentServerSnapshot,
  );

  const pushRecent = useCallback((entry: RecentEntry) => {
    const prev = getRecentSnapshot();
    const next = [entry, ...prev.filter((p) => p.prompt !== entry.prompt)].slice(0, RECENT_MAX);
    writeRecent(next);
  }, []);

  const removeRecent = useCallback((promptToRemove: string) => {
    const prev = getRecentSnapshot();
    writeRecent(prev.filter((e) => e.prompt !== promptToRemove));
  }, []);

  // ---- Lightbox state for fullscreen image viewing ----
  const [lightbox, setLightbox] = useState<{ index: number } | null>(null);

  // ---- Voice-to-prompt (Web Speech API) ----
  // Browser support is computed via useSyncExternalStore so the value is
  // deterministic across SSR (false) and client (true if API present).
  const voiceSupported = useSyncExternalStore(
    subscribeVoiceSupport,
    getVoiceSupportClient,
    getVoiceSupportServer,
  );
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const voiceBaseRef = useRef('');
  const voiceFinalRef = useRef('');

  // Tear down on unmount so a stray recognition session can't outlive the tab.
  useEffect(
    () => () => {
      try {
        recognitionRef.current?.abort();
      } catch {
        /* recogniser already stopped — ignore */
      }
    },
    [],
  );

  function stopVoice() {
    try {
      recognitionRef.current?.stop();
    } catch {
      /* fine — onend will run anyway */
    }
  }

  function startVoice() {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor || isBusy) return;

    setVoiceError(null);
    voiceBaseRef.current = prompt.trim();
    voiceFinalRef.current = '';

    let rec: SpeechRecognitionLike;
    try {
      rec = new Ctor();
    } catch {
      setVoiceError('Voice input could not start in this browser.');
      return;
    }
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang =
      typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-US';

    rec.onstart = () => {
      setListening(true);
      track('playground_voice_start');
    };
    rec.onerror = (e) => {
      setListening(false);
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setVoiceError('Microphone permission was denied. Enable it in your browser settings.');
      } else if (e.error === 'no-speech') {
        setVoiceError("Didn't catch that — tap the mic and try again.");
      } else if (e.error === 'audio-capture') {
        setVoiceError('No microphone was found on this device.');
      } else {
        setVoiceError('Voice input stopped unexpectedly.');
      }
      track('playground_voice_error', { reason: e.error });
    };
    rec.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        const transcript = result[0]?.transcript ?? '';
        if (result.isFinal) {
          voiceFinalRef.current += (voiceFinalRef.current ? ' ' : '') + transcript.trim();
        } else {
          interim += transcript;
        }
      }
      const spoken = `${voiceFinalRef.current} ${interim}`.trim().replace(/\s+/g, ' ');
      const base = voiceBaseRef.current;
      const merged = base ? `${base} ${spoken}`.trim() : spoken;
      setPrompt(merged.slice(0, MAX_PROMPT));
    };

    try {
      rec.start();
      recognitionRef.current = rec;
    } catch {
      // Some browsers throw if start() is called twice in a row.
      setVoiceError('Voice input is already running. Tap the mic to stop.');
    }
  }

  function toggleVoice() {
    if (listening) stopVoice();
    else startVoice();
  }

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      objectUrlsRef.current = [];
    };
  }, []);

  // On mobile, when generation kicks off, smoothly scroll the result canvas
  // into view so the user sees the shimmer/spinner without manual scrolling.
  useEffect(() => {
    if (status !== 'generating') return;
    if (typeof window === 'undefined') return;
    if (window.innerWidth >= 720) return;
    canvasRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [status]);

  function resetUrls() {
    objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    objectUrlsRef.current = [];
  }

  async function enhance() {
    const trimmed = prompt.trim();
    if (!trimmed || status === 'enhancing' || status === 'generating') return;
    setStatus('enhancing');
    setError(null);
    track('playground_enhance_prompt', { len: trimmed.length });
    try {
      const res = await fetch('/api/enhance-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: trimmed }),
      });
      const data = (await res.json()) as { prompt?: string; error?: string };
      if (!res.ok || !data.prompt) {
        throw new Error(data.error || `Enhance failed (${res.status}).`);
      }
      setPrompt(data.prompt.slice(0, MAX_PROMPT));
      setStatus('idle');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not enhance prompt.');
      setStatus('error');
    }
  }

  function surpriseMe() {
    if (isBusy) return;
    const candidates = SAMPLES.filter((s) => s.prompt !== prompt);
    const pick = candidates[Math.floor(Math.random() * candidates.length)] ?? SAMPLES[0];
    setPrompt(pick.prompt);
    track('playground_surprise_me', { tag: pick.tag });
  }

  // Append a creative style modifier without clobbering what the user typed.
  // Idempotent — won't add the same modifier twice in a row.
  function applyModifier(modifier: string) {
    if (isBusy) return;
    setPrompt((p) => {
      const t = p.trim();
      if (!t) return modifier.charAt(0).toUpperCase() + modifier.slice(1);
      if (t.toLowerCase().includes(modifier.toLowerCase())) return t;
      const sep = /[.,;:!?]$/.test(t) ? ' ' : ', ';
      return (t + sep + modifier).slice(0, MAX_PROMPT);
    });
    track('playground_modifier_apply', { modifier });
  }

  // Pipe the currently shown generated image into the Edit tab as a
  // ready-to-use File. We refetch the URL (works for both blob: object
  // URLs and data: URLs) and hand the resulting File up to PlaygroundClient.
  // (Named with `sendTo…` rather than `useIn…` so the hooks lint rule
  // doesn't mistake it for a custom hook.)
  async function sendToEdit(img: GeneratedImage) {
    if (!onUseInEdit) return;
    try {
      const res = await fetch(img.url);
      const blob = await res.blob();
      const mime = blob.type || 'image/png';
      const ext = mime.split('/')[1]?.split(';')[0] || 'png';
      const baseName = img.filename.replace(/\.[a-z0-9]+$/i, '') || `malakavenu-${img.seed}`;
      const file = new File([blob], `${baseName}.${ext}`, { type: mime });
      track('playground_use_in_edit', { seed: img.seed, model: meta?.model ?? null });
      // Close the lightbox so the EditTab tab change isn't visually obscured.
      setLightbox(null);
      onUseInEdit(file);
    } catch {
      setError('Could not transfer this image to the editor — please try downloading and re-uploading.');
      setStatus('error');
    }
  }

  // Web Share API where available, clipboard fallback elsewhere.
  async function shareCurrent(img: GeneratedImage) {
    if (typeof navigator === 'undefined') return;
    const shareData: ShareData = {
      title: "I made this with Malaka's AI playground",
      text: prompt.slice(0, 240),
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    };
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share(shareData);
        track('playground_share', { method: 'web-share', seed: img.seed });
        return;
      } catch {
        /* user cancelled — fall through to clipboard fallback */
      }
    }
    try {
      await navigator.clipboard.writeText(`${prompt}\n\n${shareData.url ?? ''}`.trim());
      track('playground_share', { method: 'clipboard', seed: img.seed });
    } catch {
      /* clipboard blocked — silent */
    }
  }

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed || status === 'generating') return;

    setStatus('generating');
    setError(null);
    setImages([]);
    setMeta(null);
    resetUrls();

    const startedAt = performance.now();
    const aspectDef = ASPECTS.find((a) => a.id === aspect) ?? ASPECTS[0];
    track('playground_generate', {
      model,
      count,
      prompt_len: trimmed.length,
      aspect,
    });

    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: trimmed,
          model,
          count,
          width: aspectDef.width,
          height: aspectDef.height,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}) as { error?: string });
        throw new Error(data?.error || `Request failed (${res.status}).`);
      }

      const ms = Math.round(performance.now() - startedAt);
      const ct = res.headers.get('content-type') || '';
      const stamp = Date.now();

      if (ct.startsWith('image/')) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        objectUrlsRef.current.push(url);
        const seed = Number(res.headers.get('X-Image-Seed')) || stamp;
        setImages([
          {
            url,
            seed,
            provider: res.headers.get('X-Image-Provider') || 'pollinations',
            filename: `malakavenu-${seed}.png`,
          },
        ]);
        setMeta({
          ms,
          provider: res.headers.get('X-Image-Provider') || 'pollinations',
          model: res.headers.get('X-Image-Model') || model,
        });
      } else {
        const data = (await res.json()) as {
          images: Array<{ dataUrl: string; seed: number; provider: string }>;
        };
        setImages(
          data.images.map((img, i) => ({
            url: img.dataUrl,
            seed: img.seed,
            provider: img.provider,
            filename: `malakavenu-${img.seed || stamp + i}.png`,
          })),
        );
        setMeta({ ms, provider: data.images[0]?.provider || 'pollinations', model });
      }

      setStatus('done');
      pushRecent({ prompt: trimmed, model, ts: Date.now() });
      track('playground_generate_success', { model, count, ms });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      setError(message);
      setStatus('error');
      track('playground_generate_error', { model, message });
    }
  }

  const isBusy = status === 'generating' || status === 'enhancing';
  const promptTrimmed = prompt.trim();
  const canSubmit = !!promptTrimmed && !isBusy;
  const counterNear = prompt.length > MAX_PROMPT * 0.8 && prompt.length <= MAX_PROMPT * 0.95;
  const counterFull = prompt.length > MAX_PROMPT * 0.95;

  // Lightweight prompt-quality coach. Heuristic only — counts words against
  // simple thresholds to nudge users toward more descriptive prompts.
  const promptQuality = useMemo(() => {
    const t = promptTrimmed;
    if (!t) return null;
    const words = t.split(/\s+/).filter(Boolean).length;
    if (words < 8) {
      return {
        level: 'vague' as const,
        label: 'Vague',
        hint: 'Try adding subject, mood, style, lighting or camera (e.g. "35mm, golden hour").',
      };
    }
    if (words < 25) {
      return {
        level: 'good' as const,
        label: 'Good',
        hint: 'Solid prompt — add a style or framing for richer detail.',
      };
    }
    return {
      level: 'vivid' as const,
      label: 'Vivid',
      hint: 'Detailed prompt — should produce rich, on-brief images.',
    };
  }, [promptTrimmed]);

  // Lightbox keyboard nav + scroll-lock side effects.
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightbox(null);
      } else if (e.key === 'ArrowRight' && images.length > 1) {
        setLightbox((s) => (s ? { index: (s.index + 1) % images.length } : s));
      } else if (e.key === 'ArrowLeft' && images.length > 1) {
        setLightbox((s) => (s ? { index: (s.index - 1 + images.length) % images.length } : s));
      }
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [lightbox, images.length]);

  return (
    <div className="pg-stack">
      {/* PROMPT */}
      <form onSubmit={submit} className="pg-stack" style={{ gap: 16 }}>
        <div className="pg-section-label">
          <strong>1 · Describe your image</strong>
          <span>Plain English works great</span>
        </div>

        <div className="pg-prompt">
          <label htmlFor="pg-prompt" className="sr-only">
            Image prompt
          </label>
          <div className="pg-prompt-row">
            <textarea
              id="pg-prompt"
              className="pg-prompt-textarea"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value.slice(0, MAX_PROMPT))}
              placeholder={PLACEHOLDER_HINTS[placeholderIdx]}
              rows={4}
              maxLength={MAX_PROMPT}
              disabled={isBusy}
              onKeyDown={(e) => {
                // Submit with ⌘+Enter / Ctrl+Enter from inside the textarea.
                // Plain Enter still inserts a newline (multi-line prompts welcome).
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  if (canSubmit) void submit();
                }
              }}
            />
            {/* Inline chat-style send button — always reachable on mobile,
                right next to the prompt the user just typed. */}
            <button
              type="submit"
              className="pg-send-fab"
              disabled={!canSubmit}
              aria-label={
                status === 'generating'
                  ? 'Generating image…'
                  : count > 1
                    ? `Generate ${count} variations`
                    : 'Generate image'
              }
              title="Generate · ⌘↵"
            >
              {status === 'generating' ? (
                <span className="pg-send-fab-spinner" aria-hidden="true" />
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
                  strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                  <path d="M5 12h14" />
                  <path d="m13 6 6 6-6 6" />
                </svg>
              )}
            </button>
          </div>
          <div className="pg-prompt-toolbar">
            <div className="pg-prompt-meta">
              <span
                className="pg-prompt-counter"
                data-near={counterNear || undefined}
                data-full={counterFull || undefined}
              >
                {prompt.length}/{MAX_PROMPT}
              </span>
              {promptQuality && (
                <span
                  className="pg-quality"
                  data-level={promptQuality.level}
                  title={promptQuality.hint}
                  aria-label={`Prompt quality: ${promptQuality.label}. ${promptQuality.hint}`}
                >
                  <span className="pg-quality-dot" aria-hidden="true" />
                  {promptQuality.label}
                </span>
              )}
              {prompt.length > 0 && (
                <button
                  type="button"
                  className="pg-iconpill"
                  onClick={() => setPrompt('')}
                  disabled={isBusy}
                  aria-label="Clear prompt"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="pg-prompt-actions">
              {voiceSupported && (
                <button
                  type="button"
                  className={`pg-iconpill pg-mic ${listening ? 'pg-mic--on' : ''}`}
                  onClick={toggleVoice}
                  disabled={isBusy && !listening}
                  aria-pressed={listening}
                  aria-label={listening ? 'Stop voice input' : 'Start voice input'}
                  title={listening ? 'Tap to stop · we transcribe locally via Web Speech' : 'Speak your prompt'}
                >
                  {listening ? (
                    <>
                      <span className="pg-mic-pulse" aria-hidden="true">
                        <span />
                        <span />
                        <span />
                      </span>
                      <span className="pg-mic-label-full">Listening…</span>
                      <span className="pg-mic-label-short">Live</span>
                    </>
                  ) : (
                    <>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        focusable="false"
                      >
                        <rect x="9" y="3" width="6" height="12" rx="3" />
                        <path d="M5 11a7 7 0 0 0 14 0" />
                        <line x1="12" y1="19" x2="12" y2="22" />
                      </svg>
                      <span className="pg-label-full">Speak</span>
                    </>
                  )}
                </button>
              )}
              <button
                type="button"
                className="pg-iconpill"
                onClick={surpriseMe}
                disabled={isBusy}
                title="Drop in a random sample prompt"
                aria-label="Surprise me with a random sample prompt"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                  <path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <circle cx="8" cy="9" r="1" />
                  <circle cx="16" cy="9" r="1" />
                  <circle cx="12" cy="14" r="1" />
                </svg>
                <span className="pg-label-full">Surprise me</span>
                <span className="pg-label-short">Random</span>
              </button>
              <button
                type="button"
                className="pg-iconpill pg-iconpill--accent"
                onClick={enhance}
                disabled={!promptTrimmed || isBusy}
                title="Use AI to expand your idea into a detailed prompt"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                  <path d="M12 3v3M19.07 4.93l-2.12 2.12M21 12h-3M19.07 19.07l-2.12-2.12M12 21v-3M4.93 19.07l2.12-2.12M3 12h3M4.93 4.93l2.12 2.12" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                {status === 'enhancing' ? 'Enhancing…' : 'Enhance'}
              </button>
            </div>
          </div>
          {/* Voice status — visible "live transcript" hint while listening,
              and any voice-specific error from the SpeechRecognition API. */}
          {(listening || voiceError) && (
            <div
              className={`pg-voice-status ${voiceError ? 'pg-voice-status--error' : ''}`}
              role={voiceError ? 'alert' : 'status'}
              aria-live="polite"
            >
              {voiceError ? (
                <>
                  <span aria-hidden="true">⚠</span> {voiceError}
                </>
              ) : (
                <>
                  <span className="pg-voice-dot" aria-hidden="true" />
                  Listening — speak now. Tap the mic again when you&apos;re done.
                </>
              )}
            </div>
          )}
        </div>

        {/* STYLE MODIFIERS — only meaningful once user has typed something */}
        {promptTrimmed && (
          <div className="pg-mod-row">
            <span className="pg-mod-label" aria-hidden="true">
              Add a vibe:
            </span>
            <div
              className="pg-modifiers"
              role="group"
              aria-label="Add a style modifier to the prompt"
            >
              {STYLE_MODIFIERS.map((m) => {
                const already = prompt.toLowerCase().includes(m.append.toLowerCase());
                return (
                  <button
                    key={m.label}
                    type="button"
                    className="pg-modifier"
                    onClick={() => applyModifier(m.append)}
                    disabled={isBusy || already}
                    aria-pressed={already}
                    title={already ? `${m.label} already applied` : `Append: ${m.append}`}
                  >
                    <span aria-hidden="true">{m.emoji}</span>
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* RECENT — last 6 prompts the user generated, persisted to localStorage */}
        {recent.length > 0 && (
          <>
            <div className="pg-section-label">
              <strong>Your recent sparks</strong>
              <span>Tap to reload · saved on this device only</span>
            </div>
            <div className="pg-recent" aria-label="Your recent prompts">
              {recent.map((r) => (
                <div key={r.ts} className="pg-recent-card">
                  <button
                    type="button"
                    className="pg-recent-load"
                    onClick={() => {
                      setPrompt(r.prompt);
                      setModel(r.model);
                      track('playground_recent_load', { model: r.model });
                    }}
                    disabled={isBusy}
                    title="Load this prompt"
                  >
                    <span className="pg-recent-meta">
                      <span className="pg-recent-model">{r.model}</span>
                      <span className="pg-recent-time">
                        {new Date(r.ts).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </span>
                    <span className="pg-recent-text">{r.prompt}</span>
                  </button>
                  <button
                    type="button"
                    className="pg-recent-remove"
                    onClick={() => removeRecent(r.prompt)}
                    aria-label="Remove this recent prompt"
                    title="Remove"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* SAMPLES */}
        <div className="pg-section-label">
          <strong>2 · Or start from a spark</strong>
          <span>Tap a card to load it</span>
        </div>
        <div className="pg-samples">
          {SAMPLES.map((s) => {
            const active = s.prompt === prompt;
            return (
              <button
                key={s.tag + s.emoji}
                type="button"
                onClick={() => {
                  setPrompt(s.prompt);
                  track('playground_sample_pick', { tag: s.tag });
                }}
                disabled={isBusy}
                className="pg-sample"
                aria-pressed={active}
                style={
                  active
                    ? {
                        borderColor: 'rgba(124,92,255,0.55)',
                        background:
                          'linear-gradient(180deg, rgba(124,92,255,0.12), rgba(34,211,238,0.06))',
                      }
                    : undefined
                }
              >
                <div className="pg-sample-head">
                  <span className="pg-sample-emoji" aria-hidden="true">
                    {s.emoji}
                  </span>
                  <span className="pg-sample-tag">{s.tag}</span>
                </div>
                <div className="pg-sample-text">{s.prompt}</div>
              </button>
            );
          })}
        </div>

        {/* MODEL */}
        <div className="pg-section-label">
          <strong>3 · Pick a model</strong>
          <span>Different artists, different vibes</span>
        </div>
        <div className="pg-models" role="radiogroup" aria-label="Image model">
          {MODELS.map((m) => {
            const active = model === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setModel(m.id)}
                disabled={isBusy}
                className="pg-model"
                role="radio"
                aria-checked={active}
                tabIndex={active ? 0 : -1}
              >
                <span className="pg-model-name">{m.label}</span>
                <span className="pg-model-tag">{m.tag}</span>
                {m.badge && <span className="pg-model-badge">{m.badge}</span>}
              </button>
            );
          })}
        </div>

        {/* ASPECT */}
        <div className="pg-section-label">
          <strong>4 · Shape</strong>
          <span>Square for posts, tall for phones, wide for headers</span>
        </div>
        <div className="pg-aspects" role="radiogroup" aria-label="Aspect ratio">
          {ASPECTS.map((a) => {
            const active = aspect === a.id;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setAspect(a.id)}
                disabled={isBusy}
                className={`pg-aspect pg-aspect--${a.id}`}
                role="radio"
                aria-checked={active}
                tabIndex={active ? 0 : -1}
                title={`${a.width} × ${a.height}`}
              >
                <span className={`pg-aspect-shape pg-aspect-shape--${a.id}`} aria-hidden="true" />
                <span className="pg-aspect-meta">
                  <span className="pg-aspect-name">{a.label}</span>
                  <span className="pg-aspect-hint">{a.hint}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* COUNT */}
        <div className="pg-section-label">
          <strong>5 · How many?</strong>
          <span>One sharp shot or four to compare</span>
        </div>
        <div className="pg-segmented" role="group" aria-label="Number of images">
          {COUNT_OPTIONS.map((opt) => {
            const active = count === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                className="pg-segmented-opt"
                aria-pressed={active}
                onClick={() => setCount(opt.value)}
                disabled={isBusy}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Bottom CTA fallback for users who scrolled past the inline send. */}
        <button type="submit" className="pg-submit" disabled={!canSubmit}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
            <path d="M5 3v4M3 5h4M6 17v4M4 19h4M13 3l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" />
          </svg>
          {status === 'generating'
            ? count > 1
              ? `Painting ${count}…`
              : 'Painting…'
            : count > 1
              ? `Generate ${count}`
              : 'Generate image'}
        </button>
        <p className="pg-submit-hint">
          Tap the arrow inside the prompt or this button to generate.{' '}
          <span className="pg-hint-desktop">
            Press <kbd>⌘ ↵</kbd> from inside the textarea on desktop.{' '}
          </span>
          Typical wait <strong>3–15 s</strong> on the free tier.
        </p>
      </form>

      {/* RESULT CANVAS */}
      <div ref={canvasRef} className="pg-canvas" aria-live="polite">
        {status === 'idle' && images.length === 0 && (
          <div className="pg-canvas-empty">
            <div className="pg-canvas-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" focusable="false">
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <circle cx="9" cy="9" r="1.6" />
                <path d="m4 17 5-5 4 4 3-3 4 4" />
              </svg>
            </div>
            <h3 className="pg-canvas-title">
              {promptTrimmed
                ? 'Ready when you are'
                : 'Your image will appear here'}
            </h3>
            <p className="pg-canvas-body">
              {promptTrimmed ? (
                <>
                  Hit the <strong>arrow above</strong> (or the Generate button) to render this
                  prompt. Nothing is saved on the server.
                </>
              ) : (
                <>
                  Tap a sample, hit <strong>Enhance</strong> to richen it, choose a model, then{' '}
                  <strong>Generate</strong>. Nothing is saved on the server.
                </>
              )}
            </p>
          </div>
        )}

        {status === 'enhancing' && (
          <div className="pg-canvas-empty">
            <div className="pg-skeleton-status">
              <span className="pg-spinner-ring" aria-hidden="true" />
              <span>Polishing your idea into a richly detailed prompt…</span>
            </div>
          </div>
        )}

        {status === 'generating' && (
          <div className="pg-skeleton">
            <div className="pg-skeleton-status">
              <span className="pg-spinner-ring" aria-hidden="true" />
              <span>
                {count > 1
                  ? `Painting ${count} variations in parallel… 5–25s`
                  : 'Calling the model… 3–15s on the free tier.'}
              </span>
            </div>
            <div className={`pg-skeleton-grid ${count > 1 ? 'pg-skeleton-grid--multi' : ''}`}>
              {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="pg-skeleton-tile" />
              ))}
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="pg-error">
            <div className="pg-error-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" focusable="false">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <p className="pg-error-title">Something went wrong</p>
            <p className="pg-error-body">{error}</p>
            <button
              type="button"
              className="pg-iconpill pg-iconpill--accent"
              onClick={() => submit()}
              style={{ marginTop: 6 }}
            >
              Try again
            </button>
          </div>
        )}

        {status === 'done' && images.length > 0 && (
          <div className="pg-result">
            <div
              className={`pg-result-grid ${images.length > 1 ? 'pg-result-grid--multi' : ''}`}
            >
              {images.map((img, i) => (
                // We keep this as an `<a>` so right-click → "Save image as" and
                // shift/middle-click still work as the user expects, but the
                // primary click opens the lightbox for fullscreen viewing.
                <a
                  key={i}
                  href={img.url}
                  download={img.filename}
                  onClick={(e) => {
                    e.preventDefault();
                    setLightbox({ index: i });
                    track('playground_image_open', {
                      model: meta?.model ?? null,
                      index: i,
                      of: images.length,
                    });
                  }}
                  className={`pg-result-tile ${images.length === 1 ? 'pg-result-tile--single' : ''}`}
                  aria-label={`View image ${i + 1} fullscreen`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={images.length === 1 ? prompt : `${prompt} — variation ${i + 1}`}
                  />
                  <span className="pg-result-tile-overlay" aria-hidden="true">
                    <span>#{img.seed}</span>
                    <span>⤢ Expand</span>
                  </span>
                </a>
              ))}
            </div>

            {meta && (
              <div className="pg-result-meta">
                <span>
                  <strong>{meta.model}</strong> · {Math.round(meta.ms / 100) / 10}s ·{' '}
                  {meta.provider}
                </span>
                <div className="pg-result-actions">
                  <button
                    type="button"
                    className="pg-iconpill"
                    onClick={() => {
                      void submit();
                    }}
                    title="Re-roll with the same prompt"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                      <path d="M21 3v5h-5" />
                      <path d="M3 21v-5h5" />
                    </svg>
                    Re-roll
                  </button>
                  <button
                    type="button"
                    className="pg-iconpill"
                    onClick={() => void shareCurrent(images[0])}
                    title="Share this image"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                      <circle cx="18" cy="5" r="3" />
                      <circle cx="6" cy="12" r="3" />
                      <circle cx="18" cy="19" r="3" />
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                    </svg>
                    Share
                  </button>
                  {onUseInEdit && images.length === 1 && (
                    <button
                      type="button"
                      className="pg-iconpill"
                      onClick={() => void sendToEdit(images[0])}
                      title="Send this image to the Edit tab — apply filters or AI restyle"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                      </svg>
                      Edit this
                    </button>
                  )}
                  {images.length === 1 && (
                    <a
                      href={images[0].url}
                      download={images[0].filename}
                      className="pg-iconpill pg-iconpill--accent"
                      onClick={() =>
                        track('playground_image_download', {
                          model: meta?.model ?? null,
                          index: 0,
                          of: 1,
                        })
                      }
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Download
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <p className="pg-foot">
        Free to use · generated images aren&apos;t stored on our servers ·{' '}
        <strong>not for production</strong>. Built with the same MCP/agent skills patterns I write
        about.
      </p>

      {/* LIGHTBOX — fullscreen viewer with download + share. */}
      {lightbox && images[lightbox.index] && (
        <div
          className="pg-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Generated image viewer"
          onClick={(e) => {
            // Click on backdrop closes; clicks bubbling from panel are stopped below.
            if (e.target === e.currentTarget) setLightbox(null);
          }}
        >
          <div className="pg-lightbox-panel" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="pg-lightbox-close"
              onClick={() => setLightbox(null)}
              aria-label="Close image viewer"
              autoFocus
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  className="pg-lightbox-nav pg-lightbox-nav--prev"
                  onClick={() =>
                    setLightbox((s) =>
                      s ? { index: (s.index - 1 + images.length) % images.length } : s,
                    )
                  }
                  aria-label="Previous image"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="pg-lightbox-nav pg-lightbox-nav--next"
                  onClick={() =>
                    setLightbox((s) => (s ? { index: (s.index + 1) % images.length } : s))
                  }
                  aria-label="Next image"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </button>
              </>
            )}

            <div className="pg-lightbox-imgwrap">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={images[lightbox.index].url}
                alt={prompt}
                className="pg-lightbox-img"
              />
            </div>

            <div className="pg-lightbox-foot">
              <p className="pg-lightbox-prompt">{prompt}</p>
              <div className="pg-lightbox-actions">
                <span className="pg-lightbox-meta">
                  {images.length > 1 && `${lightbox.index + 1} / ${images.length} · `}
                  #{images[lightbox.index].seed}
                </span>
                <button
                  type="button"
                  className="pg-iconpill"
                  onClick={() => void shareCurrent(images[lightbox.index])}
                  title="Share this image"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                  Share
                </button>
                {onUseInEdit && (
                  <button
                    type="button"
                    className="pg-iconpill"
                    onClick={() => void sendToEdit(images[lightbox.index])}
                    title="Send this image to the Edit tab"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                    </svg>
                    Edit this
                  </button>
                )}
                <a
                  href={images[lightbox.index].url}
                  download={images[lightbox.index].filename}
                  className="pg-iconpill pg-iconpill--accent"
                  onClick={() =>
                    track('playground_image_download', {
                      model: meta?.model ?? null,
                      index: lightbox.index,
                      of: images.length,
                      surface: 'lightbox',
                    })
                  }
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
