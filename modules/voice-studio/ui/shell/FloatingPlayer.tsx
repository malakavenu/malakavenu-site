'use client';

/**
 * FloatingPlayer — Spotify-style persistent audio bar pinned to the viewport
 * bottom. Owns the single shared `<audio>` element so it persists across
 * panel switches, exposes that element to the avatar via `useAudioContext`,
 * and gives the user play / pause / seek / speed / download from anywhere.
 *
 * The audio element is rendered ONCE at the top level (no conditional
 * remounting), so the lipsync connection in the avatar stays valid even
 * when the active track changes. The visual chrome (controls bar) below
 * it is what toggles based on `activeTrack`.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAudioContext } from '../AudioContext';
import { formatDuration } from '../../client/audio-utils';
import { exportAsMp3, downloadBlob } from '../../client/mp3-export';
import {
  PlayIcon,
  PauseIcon,
  DownloadIcon,
  SpinnerIcon,
  CloseIcon,
} from '../shared/Icons';
import styles from '../../styles/voice-studio.module.css';

const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;

export function FloatingPlayer() {
  const { activeTrack, setActiveAudio, clearTrack } = useAudioContext();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState<number>(1);
  const [downloading, setDownloading] = useState(false);

  // Publish the stable audio element to the shared context once on mount so
  // the avatar's lipsync wiring can grab it. Because the element is never
  // remounted, this ref never goes stale.
  useEffect(() => {
    setActiveAudio(audioRef.current);
    return () => setActiveAudio(null);
  }, [setActiveAudio]);

  // Auto-play whenever a new track is published. Loading the new src here
  // (via setAttribute on the existing element) preserves the element identity
  // so the avatar's connected analyser keeps producing visemes.
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !activeTrack) return;
    if (el.src !== activeTrack.url) {
      el.src = activeTrack.url;
      el.load();
    }
    el.playbackRate = speed;
    el.currentTime = 0;
    el.play()
      .then(() => setPlaying(true))
      .catch(() => setPlaying(false));
  }, [activeTrack, speed]);

  const onTimeUpdate = useCallback(() => {
    if (audioRef.current) setCurrent(audioRef.current.currentTime);
  }, []);

  const onLoadedMetadata = useCallback(() => {
    if (audioRef.current) setDuration(audioRef.current.duration || 0);
  }, []);

  const onEnded = useCallback(() => setPlaying(false), []);

  const togglePlay = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      el.play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
    }
  }, [playing]);

  const onSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = t;
      setCurrent(t);
    }
  }, []);

  const cycleSpeed = useCallback(() => {
    const idx = SPEEDS.indexOf(speed as 0.75);
    const next = SPEEDS[(idx + 1) % SPEEDS.length];
    setSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  }, [speed]);

  const onDownload = useCallback(async () => {
    if (!activeTrack || downloading) return;
    setDownloading(true);
    try {
      const { blob } = await exportAsMp3(activeTrack.url);
      const safeTitle = activeTrack.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || activeTrack.panel;
      downloadBlob(blob, `voice-studio-${safeTitle}.mp3`);
    } catch (err) {
      console.error('[voice-studio] download failed', err);
    } finally {
      setDownloading(false);
    }
  }, [activeTrack, downloading]);

  return (
    <>
      {/* Stable, always-mounted audio element. Never moves between DOM trees so
          the avatar's lipsync analyser stays bound to a live node. */}
      <audio
        ref={audioRef}
        preload="metadata"
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={onEnded}
        className={styles.floatingPlayerHiddenAudio}
        aria-hidden="true"
      />

      {activeTrack && (
        <div className={styles.floatingPlayer} role="region" aria-label="Audio player">
          <div className={styles.floatingPlayerLeft}>
            <div className={styles.floatingPlayerCover}>
              <PulseDot active={playing} />
            </div>
            <div className={styles.floatingPlayerMeta}>
              <span className={styles.floatingPlayerTitle}>{activeTrack.title}</span>
              {activeTrack.provider && (
                <span className={styles.floatingPlayerProvider}>{activeTrack.provider}</span>
              )}
            </div>
          </div>

          <div className={styles.floatingPlayerCenter}>
            <button
              type="button"
              className={styles.floatingPlayerPlay}
              onClick={togglePlay}
              aria-label={playing ? 'Pause' : 'Play'}
              title={playing ? 'Pause' : 'Play'}
            >
              {playing ? <PauseIcon /> : <PlayIcon />}
            </button>
            <div className={styles.floatingPlayerSeekRow}>
              <span className={styles.floatingPlayerTime}>{formatDuration(current)}</span>
              <input
                type="range"
                className={styles.floatingPlayerSeek}
                min={0}
                max={duration || 0}
                step={0.05}
                value={current}
                onChange={onSeek}
                aria-label="Seek"
                style={{
                  ['--vs-progress' as string]: duration ? `${(current / duration) * 100}%` : '0%',
                }}
              />
              <span className={styles.floatingPlayerTime}>{formatDuration(duration)}</span>
            </div>
          </div>

          <div className={styles.floatingPlayerRight}>
            <button
              type="button"
              className={styles.floatingPlayerSpeed}
              onClick={cycleSpeed}
              aria-label={`Speed ${speed}×`}
              title={`Speed ${speed}× (click to cycle)`}
            >
              {speed}×
            </button>
            <button
              type="button"
              onClick={onDownload}
              disabled={downloading}
              className={styles.floatingPlayerIconBtn}
              aria-label={downloading ? 'Preparing MP3 download' : 'Download as MP3'}
              title={downloading ? 'Encoding MP3…' : 'Download as MP3'}
            >
              {downloading ? <SpinnerIcon /> : <DownloadIcon />}
            </button>
            <button
              type="button"
              className={styles.floatingPlayerIconBtn}
              onClick={clearTrack}
              aria-label="Close player"
              title="Close"
            >
              <CloseIcon />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function PulseDot({ active }: { active: boolean }) {
  return (
    <span
      className={`${styles.floatingPlayerDot} ${active ? styles.floatingPlayerDotActive : ''}`}
      aria-hidden="true"
    />
  );
}

