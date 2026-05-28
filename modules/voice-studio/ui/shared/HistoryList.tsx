'use client';

/**
 * History list — shows recent voice generations for the current panel.
 */

import { useState, useCallback } from 'react';
import type { HistoryEntry } from './useHistory';
import { exportAsMp3, downloadBlob } from '../../client/mp3-export';
import { PlayIcon, DownloadIcon, SpinnerIcon } from './Icons';
import styles from '../../styles/voice-studio.module.css';

interface HistoryListProps {
  entries: HistoryEntry[];
  onPlay: (entry: HistoryEntry) => void;
  onClear: () => void;
}

export function HistoryList({ entries, onPlay, onClear }: HistoryListProps) {
  const [expanded, setExpanded] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = useCallback(async (entry: HistoryEntry) => {
    if (downloadingId) return;
    setDownloadingId(entry.id);
    try {
      const { blob } = await exportAsMp3(entry.audioUrl);
      downloadBlob(blob, `voice-${entry.id}.mp3`);
    } catch (err) {
      console.error('[voice-studio] history download failed', err);
    } finally {
      setDownloadingId(null);
    }
  }, [downloadingId]);

  if (entries.length === 0) return null;

  const visible = expanded ? entries : entries.slice(-3);

  return (
    <div className={styles.historySection}>
      <div className={styles.historyHeader}>
        <button
          type="button"
          className={styles.historyToggle}
          onClick={() => setExpanded(!expanded)}
        >
          📜 History ({entries.length})
          <span className={styles.chevron}>{expanded ? '▴' : '▾'}</span>
        </button>
        {entries.length > 0 && (
          <button
            type="button"
            className={styles.historyClear}
            onClick={onClear}
          >
            Clear
          </button>
        )}
      </div>

      <div className={styles.historyList}>
        {visible.reverse().map((entry) => (
          <div key={entry.id} className={styles.historyItem}>
            <button
              type="button"
              className={styles.historyPlayBtn}
              onClick={() => onPlay(entry)}
              aria-label={`Play: ${entry.text.slice(0, 30)}`}
            >
              <PlayIcon size={14} />
            </button>
            <div className={styles.historyMeta}>
              <span className={styles.historyText}>
                {entry.text.slice(0, 50)}{entry.text.length > 50 ? '…' : ''}
              </span>
              <span className={styles.historyInfo}>
                {entry.language} · {entry.provider} · {new Date(entry.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleDownload(entry)}
              disabled={downloadingId === entry.id}
              className={styles.historyDownload}
              aria-label={downloadingId === entry.id ? 'Encoding MP3…' : 'Download as MP3'}
              title={downloadingId === entry.id ? 'Encoding MP3…' : 'Download as MP3'}
            >
              {downloadingId === entry.id ? <SpinnerIcon size={14} /> : <DownloadIcon size={14} />}
            </button>
          </div>
        ))}
      </div>

      {!expanded && entries.length > 3 && (
        <button
          type="button"
          className={styles.historyShowAll}
          onClick={() => setExpanded(true)}
        >
          Show all {entries.length} entries
        </button>
      )}
    </div>
  );
}
