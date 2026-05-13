'use client';

import { useEffect, useRef, useState } from 'react';
import { track } from '@/lib/track';

/**
 * Reusable hook for the "Listen to this article" feature.
 *
 * Resolution order — first one that works wins:
 *   1. `/audio/<slug>.mp3` — pre-baked file in your own voice (F5-TTS).
 *      See scripts/bake-audio/README.md for how these are generated.
 *      Free at runtime, no API call, no quota.
 *   2. `/api/tts` — server TTS (Pollinations `nova` voice). Used for any
 *      slug not yet baked, or if the prebaked file is unreachable.
 *   3. `window.speechSynthesis` — browser native fallback so the button
 *      always produces audio, even with no network and no API key.
 */

type Status = 'idle' | 'loading' | 'playing' | 'error';
type AudioSource = 'baked' | 'remote' | 'browser' | null;

const MAX_TTS_CHARS = 3500;
const MAX_BROWSER_TTS_CHARS = 5000;
const BAKED_AUDIO_PATH = (slug: string) => `/audio/${slug}.mp3`;

type Args = { slug: string; title: string; speakable: string };

export function useArticleTTS({ slug, title, speakable }: Args) {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<AudioSource>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) audioRef.current.pause();
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      if (typeof window !== 'undefined' && utteranceRef.current) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function pickVoice(): SpeechSynthesisVoice | null {
    if (typeof window === 'undefined') return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;
    return (
      voices.find((v) => /Samantha|Google US English|Microsoft Aria/i.test(v.name)) ||
      voices.find((v) => v.lang?.startsWith('en')) ||
      voices[0] ||
      null
    );
  }

  function playWithBrowser(text: string) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      throw new Error('Your browser does not support speech synthesis.');
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text.slice(0, MAX_BROWSER_TTS_CHARS));
    const voice = pickVoice();
    if (voice) utter.voice = voice;
    utter.rate = 1;
    utter.pitch = 1;
    utter.onstart = () => {
      setStatus('playing');
      setSource('browser');
    };
    utter.onend = () => setStatus('idle');
    utter.onerror = (event) => {
      const reason = (event as SpeechSynthesisErrorEvent).error;
      if (reason === 'interrupted' || reason === 'canceled') {
        setStatus('idle');
        return;
      }
      setStatus('error');
      setError('Could not play audio in this browser.');
    };
    utteranceRef.current = utter;
    window.speechSynthesis.speak(utter);
  }

  /**
   * Attach the standard playback listeners to a fresh <Audio> element and
   * set status accordingly. Returns the element for further wiring.
   */
  function attachAudio(audio: HTMLAudioElement, finalSource: Exclude<AudioSource, null>) {
    audio.addEventListener('ended', () => setStatus('idle'));
    audio.addEventListener('pause', () => {
      if (!audio.ended) setStatus('idle');
    });
    audio.addEventListener('play', () => {
      setStatus('playing');
      setSource(finalSource);
    });
    audioRef.current = audio;
  }

  /**
   * Probe the prebaked file with a HEAD request. We can't just `<audio>.play()`
   * a 404 — the browser would emit an `error` event and silently fail. A
   * cheap HEAD lets us decide whether to use the baked file or skip to TTS.
   *
   * Returns the URL if the file exists, null otherwise. Cached at the
   * fetch layer (Vercel Edge / browser cache) so the round-trip cost is
   * effectively zero on repeat plays.
   */
  async function probeBakedAudio(): Promise<string | null> {
    const url = BAKED_AUDIO_PATH(slug);
    try {
      const res = await fetch(url, { method: 'HEAD' });
      return res.ok ? url : null;
    } catch {
      return null;
    }
  }

  async function toggle() {
    if (status === 'playing') {
      if (source === 'browser' && typeof window !== 'undefined') {
        window.speechSynthesis.cancel();
        setStatus('idle');
        return;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        setStatus('idle');
        return;
      }
    }

    // Resume a paused remote/baked clip without re-downloading.
    if (
      (source === 'remote' || source === 'baked') &&
      audioRef.current &&
      status === 'idle'
    ) {
      try {
        await audioRef.current.play();
        setStatus('playing');
        return;
      } catch {
        // fall through to fresh fetch
      }
    }

    setStatus('loading');
    setError(null);
    track('article_listen_start', { slug });
    const speech = `${title}. ${speakable.slice(0, MAX_TTS_CHARS)}`;

    // 1) Prebaked-in-your-voice path. Free, no API call.
    const bakedUrl = await probeBakedAudio();
    if (bakedUrl) {
      try {
        const audio = new Audio(bakedUrl);
        attachAudio(audio, 'baked');
        await audio.play();
        track('article_listen_success', { slug, source: 'baked' });
        return;
      } catch (err) {
        // Autoplay blocked or decode error — fall through to remote TTS.
        console.warn('[tts] baked playback failed, falling back to /api/tts', err);
      }
    }

    // 2) Server TTS fallback (Pollinations `nova`).
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: speech, voice: 'nova' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}) as { error?: string });
        throw new Error(data?.error || `TTS failed (${res.status}).`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = url;
      const audio = new Audio(url);
      attachAudio(audio, 'remote');
      await audio.play();
      track('article_listen_success', { slug, source: 'remote' });
    } catch (err) {
      // 3) Browser SpeechSynthesis fallback (offline-capable last resort).
      const reason = err instanceof Error ? err.message : 'Could not load audio.';
      try {
        playWithBrowser(speech);
        track('article_listen_success', { slug, source: 'browser', fallback_reason: reason });
      } catch (fallbackErr) {
        const final = fallbackErr instanceof Error ? fallbackErr.message : reason;
        setError(final);
        setStatus('error');
        track('article_listen_error', { slug, message: final });
      }
    }
  }

  return { status, error, toggle };
}
