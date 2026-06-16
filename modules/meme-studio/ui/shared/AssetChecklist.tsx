'use client';

import { useState } from 'react';
import type { AssetNeeded, MemeAsset, MemeConcept } from '../../types';
import { generateAsset } from '../../data/assets';
import { useMemeStudio } from '../MemeStudioContext';
import { CheckIcon, PlusIcon, SparkleIcon } from './Icons';
import styles from '../../styles/meme-studio.module.css';

function categoryFor(kind: AssetNeeded['kind']): MemeAsset['category'] {
  return kind === 'symbol' ? 'symbols' : 'stickers';
}

/**
 * Lists the images this concept wants (faces / symbols / stickers), whether
 * they already exist in the library, plus actions: AI-generate non-face assets
 * (saved into the library), or a Google search. Real leader faces stay manual
 * because image models can't reliably render recognizable politicians.
 */
export function AssetChecklist({
  concept,
  onAssetCreated,
}: {
  concept: MemeConcept;
  onAssetCreated?: (asset: MemeAsset) => void;
}) {
  const { config, faces, assets, reloadLibrary } = useMemeStudio();
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function exists(kind: string, leaderId?: string): boolean {
    if (kind === 'face') {
      const leader = faces.find((f) => f.leaderId === leaderId);
      return Boolean(leader && leader.photos.length > 0);
    }
    return assets.length > 0;
  }

  async function generate(a: AssetNeeded, i: number) {
    setBusy(i);
    setError(null);
    try {
      const { asset } = await generateAsset(config.apiBasePath, {
        prompt: a.description,
        category: categoryFor(a.kind),
        tags: [a.kind, ...a.suggestedQuery.toLowerCase().split(/\s+/).slice(0, 4)],
      });
      reloadLibrary();
      onAssetCreated?.(asset);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (!concept.assetsNeeded.length) {
    return <p className={styles.muted}>No extra assets needed for this concept.</p>;
  }

  return (
    <>
      <ul className={styles.checklist}>
        {concept.assetsNeeded.map((a, i) => {
          const have = exists(a.kind, a.leaderId);
          const query = encodeURIComponent(a.suggestedQuery || a.description);
          const canGenerate = a.kind !== 'face';
          return (
            <li key={i} className={styles.checklistItem} data-have={have}>
              <span className={styles.checklistMark} aria-hidden>
                {have ? <CheckIcon width={14} height={14} /> : <PlusIcon width={14} height={14} />}
              </span>
              <div className={styles.checklistBody}>
                <span className={styles.checklistDesc}>{a.description}</span>
                <span className={styles.checklistMeta}>
                  {have ? 'In library' : 'Add to'} <code>{a.target}</code>
                </span>
              </div>
              {canGenerate ? (
                <button
                  type="button"
                  className={styles.checklistGen}
                  disabled={busy !== null}
                  onClick={() => generate(a, i)}
                >
                  <SparkleIcon width={13} height={13} />
                  {busy === i ? 'Generating…' : 'Generate'}
                </button>
              ) : (
                <a
                  className={styles.checklistSearch}
                  href={`https://www.google.com/search?tbm=isch&q=${query}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Search
                </a>
              )}
            </li>
          );
        })}
      </ul>
      {error && <p className={styles.error}>{error}</p>}
    </>
  );
}
