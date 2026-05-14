'use client';

import { useEffect, useRef, useState } from 'react';
import { track } from '@/lib/track';

/**
 * Reusable hook for the "Listen to this article" feature.
 *
 * Tries the server TTS endpoint first (premium voices). If that fails for any
 * reason — auth, balance, network — it falls back transparently to the user's
 * browser-native `speechSynthesis` so the button always produces audio.
 */

type Status = 'idle' | 'loading' | 'playing' | 'error';
type AudioSource = 'remote' | 'browser' | null;

const MAX_TTS_CHARS = 3500;
const MAX_BROWSER_TTS_CHARS = 5000;

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

    if (source === 'remote' && audioRef.current && audioUrlRef.current && status === 'idle') {
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
      audio.addEventListener('ended', () => setStatus('idle'));
      audio.addEventListener('pause', () => {
        if (!audio.ended) setStatus('idle');
      });
      audio.addEventListener('play', () => {
        setStatus('playing');
        setSource('remote');
      });
      audioRef.current = audio;
      await audio.play();
      track('article_listen_success', { slug, source: 'remote' });
    } catch (err) {
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
