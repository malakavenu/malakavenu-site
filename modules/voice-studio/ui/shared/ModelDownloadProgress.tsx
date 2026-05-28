'use client';

/**
 * Reusable progress modal shown while a heavy in-browser ML model is downloading
 * for the first time (Chatterbox ~1.5 GB, F5-TTS ~200 MB, etc.).
 *
 * Receives a normalised `ModelDownloadState` and renders a clean glass-morphism
 * card with a progress bar, MB-loaded counter, current file name, and a
 * "cached after first load" reassurance line.
 */

import { useEffect, useRef, useState } from 'react';
import styles from '../../styles/voice-studio.module.css';

export interface ModelDownloadState {
  /** 0..1 */
  fraction: number;
  /** Bytes loaded in the current shard */
  loaded: number;
  /** Total bytes if known */
  total?: number;
  /** Currently-downloading file name */
  file?: string;
  /** Short status line: 'Initialising', 'Downloading model.onnx', 'Generating speech', etc. */
  status: string;
}

interface ModelDownloadProgressProps {
  open: boolean;
  /** Display name e.g. "Chatterbox Multilingual" or "F5-TTS English" */
  modelName: string;
  /** Approx total size hint, e.g. "~1.5 GB". Shown when actual total is unknown. */
  approxSize?: string;
  state: ModelDownloadState | null;
  onCancel?: () => void;
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function ModelDownloadProgress({
  open,
  modelName,
  approxSize,
  state,
  onCancel,
}: ModelDownloadProgressProps) {
  const [elapsedSec, setElapsedSec] = useState(0);
  const startedAtRef = useRef<number>(0);

  useEffect(() => {
    if (!open) return;
    startedAtRef.current = Date.now();
    const i = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 250);
    return () => clearInterval(i);
  }, [open]);

  if (!open) return null;

  const fraction = state?.fraction ?? 0;
  const pct = Math.min(100, Math.max(0, fraction * 100));
  const loaded = state?.loaded ?? 0;
  const total = state?.total;
  const file = state?.file;
  const status = state?.status ?? 'Preparing…';

  return (
    <div className={styles.consentOverlay} role="dialog" aria-modal="true">
      <div className={styles.modelDownloadCard}>
        <div className={styles.modelDownloadHeader}>
          <div className={styles.modelDownloadBadge}>First-time setup</div>
          <h3 className={styles.modelDownloadTitle}>Loading {modelName}</h3>
          <p className={styles.modelDownloadSubtitle}>
            Streaming the model to your browser. {approxSize ? `Approx ${approxSize}. ` : ''}
            Cached after the first load — instant next time.
          </p>
        </div>

        <div className={styles.modelDownloadProgressWrap}>
          <div className={styles.modelDownloadBar}>
            <div
              className={styles.modelDownloadFill}
              style={{ width: `${pct}%` }}
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              role="progressbar"
            />
          </div>
          <div className={styles.modelDownloadMeta}>
            <span className={styles.modelDownloadPct}>{pct.toFixed(0)}%</span>
            <span className={styles.modelDownloadBytes}>
              {formatBytes(loaded)}
              {total ? ` / ${formatBytes(total)}` : ''}
            </span>
            <span className={styles.modelDownloadTime}>{elapsedSec}s</span>
          </div>
        </div>

        <div className={styles.modelDownloadStatus}>
          <div className={styles.modelDownloadDot} />
          <span>{status}</span>
          {file && <code className={styles.modelDownloadFile}>{file}</code>}
        </div>

        <ul className={styles.modelDownloadTips}>
          <li>Keep this tab open — closing it pauses the download.</li>
          <li>WebGPU is used when available for ~5&times; faster inference.</li>
          <li>Future visits are instant; the model lives in your browser cache.</li>
        </ul>

        {onCancel && (
          <div className={styles.modelDownloadActions}>
            <button type="button" onClick={onCancel} className={styles.modelDownloadCancel}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
