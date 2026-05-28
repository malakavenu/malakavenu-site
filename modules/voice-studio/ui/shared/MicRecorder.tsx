'use client';

/**
 * Microphone recorder component.
 * Records audio from the user's microphone for voice cloning reference.
 */

import { useState, useRef, useCallback } from 'react';
import styles from '../../styles/voice-studio.module.css';

interface MicRecorderProps {
  onRecorded: (blob: Blob, durationSec: number) => void;
  maxDurationSec?: number;
}

export function MicRecorder({ onRecorded, maxDurationSec = 15 }: MicRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  // Declared first so `startRecording` can reference it inside its
  // interval callback without tripping the no-use-before-declare rule.
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecording(false);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 24000, channelCount: 1 },
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });

      chunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const duration = (Date.now() - startTimeRef.current) / 1000;
        onRecorded(blob, duration);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start(100);
      startTimeRef.current = Date.now();
      setRecording(true);
      setElapsed(0);

      timerRef.current = setInterval(() => {
        const secs = (Date.now() - startTimeRef.current) / 1000;
        setElapsed(secs);
        if (secs >= maxDurationSec) {
          stopRecording();
        }
      }, 100);
    } catch (err) {
      console.error('Microphone access denied:', err);
    }
  }, [maxDurationSec, onRecorded, stopRecording]);

  return (
    <div className={styles.micRecorder}>
      <button
        type="button"
        className={`${styles.micBtn} ${recording ? styles.micBtnRecording : ''}`}
        onClick={recording ? stopRecording : startRecording}
        aria-label={recording ? 'Stop recording' : 'Start recording'}
      >
        {recording ? '⏹' : '🎙'}
      </button>

      {recording && (
        <div className={styles.micStatus}>
          <span className={styles.micDot} aria-hidden="true" />
          <span>{elapsed.toFixed(1)}s / {maxDurationSec}s</span>
        </div>
      )}

      {!recording && (
        <span className={styles.micHint}>
          Record 5–15 seconds of clear speech
        </span>
      )}
    </div>
  );
}
