'use client';

import { useMemeHistory } from '../../client/history';
import { DownloadIcon, TrashIcon } from '../shared/Icons';
import styles from '../../styles/meme-studio.module.css';

export function HistoryPanel() {
  const { entries, remove, clear } = useMemeHistory();

  function download(dataUrl: string, format: string, createdAt: number) {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `meme-${format}-${createdAt}.png`;
    link.click();
  }

  return (
    <div className={styles.panel}>
      <header className={styles.panelHead}>
        <h2>History</h2>
        <p className={styles.muted}>Recently exported memes (stored locally in this browser).</p>
      </header>

      {entries.length === 0 ? (
        <p className={styles.muted}>No memes exported yet.</p>
      ) : (
        <>
          <button type="button" className={styles.ghostBtn} onClick={clear}>
            Clear all
          </button>
          <div className={styles.historyGrid}>
            {entries.map((e) => (
              <figure key={e.id} className={styles.historyCard}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={e.dataUrl} alt={e.captionEn || e.captionTe || 'meme'} />
                <figcaption>{e.captionTe || e.captionEn}</figcaption>
                <div className={styles.historyActions}>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={() => download(e.dataUrl, e.format, e.createdAt)}
                    aria-label="Download"
                  >
                    <DownloadIcon width={15} height={15} />
                  </button>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={() => remove(e.id)}
                    aria-label="Delete"
                  >
                    <TrashIcon width={15} height={15} />
                  </button>
                </div>
              </figure>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
