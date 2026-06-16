'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { MemeConcept, MemeMode } from '../../types';
import { MEME_FORMATS } from '../../data/templates';
import { renderBrandedMeme } from '../../client/brand-compositor';
import { useMemeHistory } from '../../client/history';
import { useMemeStudio } from '../MemeStudioContext';
import { AssetChecklist } from '../shared/AssetChecklist';
import { DownloadIcon, SparkleIcon } from '../shared/Icons';
import styles from '../../styles/meme-studio.module.css';

const MODES: MemeMode[] = ['hype', 'attack', 'breaking', 'quote', 'celebrate'];
const FORMATS = Object.values(MEME_FORMATS).map((f) => ({ id: f.id, name: f.name }));

export function StudioPanel() {
  const { activeConcept } = useMemeStudio();
  if (!activeConcept) {
    return (
      <div className={styles.panel}>
        <header className={styles.panelHead}>
          <h2>Studio</h2>
          <p className={styles.muted}>Pick a concept from the Feed (tap “Edit” on any card) to fine-tune it here.</p>
        </header>
      </div>
    );
  }
  return <StudioEditor key={activeConcept.id} concept={activeConcept} />;
}

function StudioEditor({ concept }: { concept: MemeConcept }) {
  const { config, language, faces, assets } = useMemeStudio();
  const { add: addHistory } = useMemeHistory();

  // Local editable mirror of the concept so the user can iterate without
  // mutating shared state until they hit Download.
  const [draft, setDraft] = useState<MemeConcept>(concept);
  const [hashInput, setHashInput] = useState(concept.hashtags.join(' '));
  const [dataUrl, setDataUrl] = useState<string>('');
  const [rendering, setRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const seq = useRef(0);

  // Re-render the brand card whenever the draft changes (debounced via seq token).
  useEffect(() => {
    const me = ++seq.current;
    setRendering(true);
    setRenderError(null);
    void renderBrandedMeme(draft, {
      basePath: config.basePath,
      language,
      faces,
      assets,
    })
      .then((url) => {
        if (me === seq.current) setDataUrl(url);
      })
      .catch((err: Error) => {
        if (me === seq.current) setRenderError(err.message || 'Could not render this card.');
      })
      .finally(() => {
        if (me === seq.current) setRendering(false);
      });
  }, [draft, language, faces, assets, config.basePath]);

  function patch(p: Partial<MemeConcept>): void {
    setDraft((d) => ({ ...d, ...p }));
  }

  function commitHashtags(value: string): void {
    setHashInput(value);
    const tags = value
      .split(/[\s,]+/)
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => (t.startsWith('#') ? t : `#${t}`))
      .slice(0, 5);
    patch({ hashtags: tags });
  }

  function download() {
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `ysrcp-meme-${draft.format}-${draft.id.slice(0, 6)}.png`;
    link.click();
    addHistory({
      dataUrl,
      captionEn: draft.headlineEn,
      captionTe: draft.headlineTe,
      format: draft.format,
    });
  }

  const format = MEME_FORMATS[draft.format] ?? MEME_FORMATS['headline-card'];
  const showQuote =
    draft.format === 'quote-card' || draft.format === 'attack-card' || draft.format === 'news-card';
  const showSub =
    draft.format !== 'quote-card' && draft.format !== 'celebration-card' && draft.format !== 'image-macro';

  const targetParty = useMemo(() => draft.faces[0]?.leaderId ?? '', [draft.faces]);

  return (
    <div className={styles.panel}>
      <header className={styles.panelHead}>
        <h2>Studio — {format.name}</h2>
        <p className={styles.muted}>
          Tweak the headline, mode and hashtags. Renders update live.
        </p>
      </header>

      <div className={styles.studioLayout}>
        <div className={styles.canvasWrap}>
          {renderError ? (
            <div
              className={styles.canvas}
              style={{ aspectRatio: '1 / 1', display: 'grid', placeItems: 'center', padding: 24 }}
              role="alert"
            >
              <span className={styles.muted}>{renderError}</span>
            </div>
          ) : dataUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img className={styles.canvas} src={dataUrl} alt="Meme preview" />
          ) : (
            <div
              className={styles.canvas}
              style={{ aspectRatio: '1 / 1' }}
              aria-busy="true"
              aria-live="polite"
            />
          )}
          <div className={styles.canvasActions}>
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={download}
              disabled={!dataUrl}
            >
              <DownloadIcon width={16} height={16} /> Download PNG
            </button>
            {rendering && <span className={styles.muted}>updating…</span>}
          </div>
        </div>

        <div className={styles.studioControls}>
          <section className={styles.controlBlock}>
            <h3>Layout</h3>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Format</label>
              <select
                className={styles.select}
                value={draft.format}
                onChange={(e) => patch({ format: e.target.value as MemeConcept['format'] })}
              >
                {FORMATS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Mode (palette)</label>
              <div className={styles.row}>
                {MODES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={`${styles.chipSmall} ${draft.mode === m ? styles.chipActive : ''}`}
                    onClick={() => patch({ mode: m })}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className={styles.controlBlock}>
            <h3>Headline</h3>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>తెలుగు headline</label>
              <textarea
                className={styles.textareaSmall}
                rows={2}
                value={draft.headlineTe}
                onChange={(e) => patch({ headlineTe: e.target.value, captionTe: e.target.value })}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>English headline</label>
              <textarea
                className={styles.textareaSmall}
                rows={2}
                value={draft.headlineEn}
                onChange={(e) => patch({ headlineEn: e.target.value, captionEn: e.target.value })}
              />
            </div>
            {showSub && (
              <>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>తెలుగు subheadline</label>
                  <textarea
                    className={styles.textareaSmall}
                    rows={2}
                    value={draft.subheadlineTe ?? ''}
                    onChange={(e) => patch({ subheadlineTe: e.target.value })}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>English subheadline</label>
                  <textarea
                    className={styles.textareaSmall}
                    rows={2}
                    value={draft.subheadlineEn ?? ''}
                    onChange={(e) => patch({ subheadlineEn: e.target.value })}
                  />
                </div>
              </>
            )}
            {showQuote && (
              <>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Quote / context (తె)</label>
                  <textarea
                    className={styles.textareaSmall}
                    rows={2}
                    value={draft.quoteTe ?? ''}
                    onChange={(e) => patch({ quoteTe: e.target.value })}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Attribution</label>
                  <input
                    className={styles.input}
                    value={draft.quoteAttribution ?? ''}
                    onChange={(e) => patch({ quoteAttribution: e.target.value })}
                  />
                </div>
              </>
            )}
          </section>

          <section className={styles.controlBlock}>
            <h3>Hashtags & handle</h3>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Hashtags (space-separated, max 5)</label>
              <input
                className={styles.input}
                value={hashInput}
                onChange={(e) => commitHashtags(e.target.value)}
                placeholder="#YSRCP #YSJagan #Navaratnalu"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Handle</label>
              <input
                className={styles.input}
                value={draft.handle}
                onChange={(e) => patch({ handle: e.target.value })}
              />
            </div>
          </section>

          <section className={styles.controlBlock}>
            <h3>Photo slot</h3>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Leader (used by attack / quote / celebration / vs cards)</label>
              <select
                className={styles.select}
                value={targetParty}
                onChange={(e) => {
                  const id = e.target.value;
                  patch({ faces: id ? [{ leaderId: id, expression: 'neutral' }] : [] });
                }}
              >
                <option value="">— None —</option>
                {faces.map((f) => (
                  <option key={f.leaderId} value={f.leaderId}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
            {faces.length === 0 && (
              <p className={styles.muted}>
                No leader photos in your library yet. Drop photos into
                <code> public/meme-studio/faces/&lt;leader&gt;/ </code> and run{' '}
                <code>npm run meme-studio:reindex</code>.
              </p>
            )}
          </section>

          <section className={styles.controlBlock}>
            <h3>Asset suggestions</h3>
            <AssetChecklist concept={draft} />
          </section>

          <section className={styles.controlBlock}>
            <h3>Source quote</h3>
            <p className={styles.muted}>
              <SparkleIcon width={13} height={13} />{' '}
              <em>{draft.sourceQuote || '(not provided)'}</em>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
