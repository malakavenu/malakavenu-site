'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { IdeasResponse, MemeConcept, MemeTone, TargetParty, TranscriptResult } from '../../types';
import { LANGUAGE_LABELS, TARGET_LABELS } from '../../config';
import { LIVE_ATTACK_ISSUES } from '../../data/knowledge';

const TONES: MemeTone[] = ['satirical', 'celebratory', 'sarcastic', 'wholesome', 'savage'];
const TARGETS: TargetParty[] = ['kutami', 'tdp', 'janasena', 'bjp', 'general'];
import { MEME_FORMATS } from '../../data/templates';
import { autoComposeMeme } from '../../client/auto-compose';
import { useMemeHistory } from '../../client/history';
import { useMemeStudio } from '../MemeStudioContext';
import { DownloadIcon, SparkleIcon } from '../shared/Icons';
import styles from '../../styles/meme-studio.module.css';

/** Renders are local canvas now (<1s each) — we can render the whole batch in parallel. */
const RENDER_CONCURRENCY = 4;

/**
 * The Feed — the primary mobile-first view.
 *
 *   ┌────────────────────────────────────┐
 *   │  HERO: paste YouTube URL + Generate │
 *   ├────────────────────────────────────┤
 *   │  ┌──────────────────────────────┐  │
 *   │  │   AUTO-RENDERED MEME IMAGE   │  │   ← each concept becomes a
 *   │  │  caption + actions row       │  │     finished meme card
 *   │  └──────────────────────────────┘  │
 *   │  ┌──────────────────────────────┐  │
 *   │  │   …                          │  │
 *   │  └──────────────────────────────┘  │
 *   └────────────────────────────────────┘
 */
export function FeedPanel({ onEdit }: { onEdit: () => void }) {
  const {
    config,
    transcript,
    setTranscript,
    concepts,
    setConcepts,
    setActiveConcept,
    language,
    setLanguage,
    target,
    setTarget,
    tone,
    setTone,
    faces,
    assets,
    setLastProvider,
    lastProvider,
    renders,
    setRender,
  } = useMemeStudio();
  const { add: addHistory } = useMemeHistory();

  const [url, setUrl] = useState('');
  const [pasted, setPasted] = useState('');
  const [pasteOpen, setPasteOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [count, setCount] = useState(2);
  const [focusIssues, setFocusIssues] = useState<string[]>([]);
  const [stage, setStage] = useState<'idle' | 'transcript' | 'ideas' | 'rendering' | 'done'>(
    'idle',
  );
  const [error, setError] = useState<string | null>(null);

  // Transcript preview state: collapsed by default; editable in-place.
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [transcriptEditing, setTranscriptEditing] = useState(false);
  const [transcriptDraft, setTranscriptDraft] = useState('');
  const [transcriptCopied, setTranscriptCopied] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => () => abortRef.current?.abort(), []);

  /** Pool-based parallel render so we don't slam Cursor with N agents at once. */
  const renderAll = useCallback(
    async (cs: MemeConcept[]) => {
      const signal = abortRef.current?.signal;
      let i = 0;
      async function worker() {
        while (i < cs.length) {
          const concept = cs[i++];
          setRender(concept.id, { status: 'rendering' });
          try {
            const dataUrl = await autoComposeMeme(concept, {
              apiBasePath: config.apiBasePath,
              basePath: config.basePath,
              language,
              faces,
              assets,
              signal,
            });
            setRender(concept.id, { status: 'ready', dataUrl });
          } catch (err) {
            if ((err as Error).name === 'AbortError') return;
            setRender(concept.id, { status: 'error', error: (err as Error).message });
          }
        }
      }
      await Promise.all(
        Array.from({ length: Math.min(RENDER_CONCURRENCY, cs.length) }, worker),
      );
      setStage('done');
    },
    [config.apiBasePath, config.basePath, language, faces, assets, setRender],
  );

  async function run(input: { url?: string; text?: string }) {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setError(null);
    setStage('transcript');

    try {
      let t: TranscriptResult;
      const tRes = await fetch(`${config.apiBasePath}/transcript`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        signal: ctrl.signal,
      });
      const tData = (await tRes.json()) as TranscriptResult & { error?: string; hint?: string };
      if (!tRes.ok) throw new Error(tData.error ?? 'Could not load transcript.');
      t = tData;
      setTranscript(t);

      setStage('ideas');
      const iRes = await fetch(`${config.apiBasePath}/ideas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: t.text,
          language,
          target,
          tone,
          count,
          knownLeaders: faces.map((f) => f.leaderId),
          focusIssues,
        }),
        signal: ctrl.signal,
      });
      const iData = (await iRes.json()) as IdeasResponse & { error?: string };
      if (!iRes.ok) throw new Error(iData.error ?? 'Could not generate ideas.');
      setConcepts(iData.concepts);
      setLastProvider(iData.provider);

      setStage('rendering');
      await renderAll(iData.concepts);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setError((err as Error).message);
      setStage('idle');
    }
  }

  function downloadMeme(c: MemeConcept) {
    const r = renders[c.id];
    if (r?.status !== 'ready') return;
    const link = document.createElement('a');
    link.href = r.dataUrl;
    link.download = `ysrcp-meme-${c.format}-${c.id.slice(0, 6)}.png`;
    link.click();
    addHistory({
      dataUrl: r.dataUrl,
      captionEn: c.headlineEn,
      captionTe: c.headlineTe,
      format: c.format,
    });
  }

  function regenerate(c: MemeConcept) {
    setRender(c.id, { status: 'rendering' });
    void autoComposeMeme(c, {
      apiBasePath: config.apiBasePath,
      basePath: config.basePath,
      language,
      faces,
      assets,
    })
      .then((dataUrl) => setRender(c.id, { status: 'ready', dataUrl }))
      .catch((err: Error) => setRender(c.id, { status: 'error', error: err.message }));
  }

  function openEditor(c: MemeConcept) {
    setActiveConcept(c);
    onEdit();
  }

  function shareMeme(c: MemeConcept) {
    const r = renders[c.id];
    if (r?.status !== 'ready') return;
    const text = c.headlineTe || c.headlineEn;
    if (navigator.share) {
      fetch(r.dataUrl)
        .then((res) => res.blob())
        .then((blob) => {
          const file = new File([blob], 'meme.png', { type: 'image/png' });
          return navigator.share({ files: [file], text });
        })
        .catch(() => {
          // Share cancelled or failed (e.g. unsupported file share) — fall
          // back to copying the caption text so the action still does something.
          if (navigator.clipboard) void navigator.clipboard.writeText(text);
        });
    } else if (navigator.clipboard) {
      void navigator.clipboard.writeText(text);
    }
  }

  const busy = stage === 'transcript' || stage === 'ideas' || stage === 'rendering';
  const stageLabel: Record<typeof stage, string> = {
    idle: '',
    transcript: 'Fetching transcript…',
    ideas: 'Writing meme captions…',
    rendering: 'Composing brand cards…',
    done: '',
  };

  return (
    <div className={styles.feed}>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className={styles.hero}>
        <h1 className={styles.heroTitle}>
          Meme Studio
        </h1>
        <p className={styles.heroSub}>
          Paste any YouTube video — get instant Telugu + English memes, grounded in the speech.
        </p>

        <div className={styles.heroInput}>
          <input
            className={styles.heroUrl}
            placeholder="Paste YouTube URL…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            inputMode="url"
            autoComplete="off"
          />
          <button
            type="button"
            className={styles.heroGo}
            disabled={busy || (!url.trim() && !pasted.trim())}
            onClick={() => run(pasted.trim() ? { text: pasted.trim() } : { url: url.trim() })}
          >
            <SparkleIcon width={16} height={16} />
            {busy ? stageLabel[stage] : 'Generate'}
          </button>
        </div>

        <div className={styles.heroChips}>
          <div className={styles.chipGroup}>
            {(['te', 'en', 'both'] as const).map((l) => (
              <button
                key={l}
                type="button"
                className={`${styles.chip} ${language === l ? styles.chipActive : ''}`}
                onClick={() => setLanguage(l)}
              >
                {l === 'both' ? 'EN + తె' : l === 'te' ? 'తెలుగు' : 'English'}
              </button>
            ))}
          </div>
          <div className={styles.chipDivider} />
          <div className={styles.chipGroup}>
            {([2, 4, 6, 8] as const).map((n) => (
              <button
                key={n}
                type="button"
                className={`${styles.chip} ${count === n ? styles.chipActive : ''}`}
                onClick={() => setCount(n)}
              >
                {n} memes
              </button>
            ))}
          </div>
        </div>

        <div className={styles.heroToggleRow}>
          <button
            type="button"
            className={styles.pasteToggle}
            onClick={() => setPasteOpen((o) => !o)}
          >
            {pasteOpen ? '− Paste text' : '+ Paste text'}
          </button>
          <button
            type="button"
            className={styles.pasteToggle}
            onClick={() => setMoreOpen((o) => !o)}
            aria-expanded={moreOpen}
          >
            {moreOpen ? '− Tone & target' : '+ Tone & target'}
          </button>
        </div>

        {pasteOpen && (
          <textarea
            className={styles.pasteArea}
            placeholder="Paste transcript text here (min 20 chars)…"
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            rows={3}
          />
        )}

        {moreOpen && (
          <div className={styles.moreOptions}>
            <div className={styles.optionBlock}>
              <label>Target</label>
              <div className={styles.chipGroup}>
                {TARGETS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`${styles.chipSmall} ${target === t ? styles.chipActive : ''}`}
                    onClick={() => setTarget(t)}
                  >
                    {TARGET_LABELS[t].split(' (')[0]}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.optionBlock}>
              <label>Tone</label>
              <div className={styles.chipGroup}>
                {TONES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`${styles.chipSmall} ${tone === t ? styles.chipActive : ''}`}
                    onClick={() => setTone(t)}
                  >
                    {t[0].toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.optionBlock}>
              <label>Focus issue (optional — anchor memes to a specific topic)</label>
              <div className={styles.chipGroup}>
                {LIVE_ATTACK_ISSUES.map((i) => {
                  const on = focusIssues.includes(i.id);
                  return (
                    <button
                      key={i.id}
                      type="button"
                      className={`${styles.chipSmall} ${on ? styles.chipActive : ''}`}
                      onClick={() =>
                        setFocusIssues((prev) =>
                          on ? prev.filter((x) => x !== i.id) : [...prev, i.id],
                        )
                      }
                      title={i.context}
                    >
                      {i.te.length > 16 ? i.label : i.te}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {error && <p className={styles.heroError}>{error}</p>}
      </section>

      {/* ── Transcript preview (visible after the URL/text has been read) ──── */}
      {transcript && (
        <section className={styles.transcriptCard} aria-labelledby="transcript-head">
          <header className={styles.transcriptHead}>
            <div className={styles.transcriptTitleGroup}>
              <h3 id="transcript-head" className={styles.transcriptTitle}>
                Transcript
              </h3>
              <span className={styles.transcriptBadge}>
                {transcript.source === 'youtube'
                  ? transcript.videoId
                    ? `YouTube · ${transcript.videoId}`
                    : 'YouTube'
                  : 'Pasted text'}
              </span>
              <span className={styles.transcriptMeta}>
                {transcript.text.length} chars
                {transcript.language ? ` · lang: ${transcript.language}` : ''}
              </span>
            </div>
            <div className={styles.transcriptActions}>
              <button
                type="button"
                className={styles.transcriptGhost}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(transcript.text);
                    setTranscriptCopied(true);
                    setTimeout(() => setTranscriptCopied(false), 1400);
                  } catch {
                    // ignore — clipboard not available
                  }
                }}
              >
                {transcriptCopied ? 'Copied ✓' : 'Copy'}
              </button>
              <button
                type="button"
                className={styles.transcriptGhost}
                onClick={() => {
                  if (!transcriptEditing) setTranscriptDraft(transcript.text);
                  setTranscriptEditing((v) => !v);
                  setTranscriptOpen(true);
                }}
              >
                {transcriptEditing ? 'Cancel' : 'Edit'}
              </button>
              <button
                type="button"
                className={styles.transcriptToggle}
                onClick={() => setTranscriptOpen((v) => !v)}
                aria-expanded={transcriptOpen}
              >
                {transcriptOpen ? 'Hide' : 'Show full'}
              </button>
            </div>
          </header>

          {transcript.warning && (
            <p className={styles.heroError} role="status">
              ⚠️ {transcript.warning}
            </p>
          )}

          {transcriptEditing ? (
            <>
              <textarea
                className={styles.transcriptEdit}
                rows={10}
                value={transcriptDraft}
                onChange={(e) => setTranscriptDraft(e.target.value)}
              />
              <div className={styles.transcriptActions}>
                <button
                  type="button"
                  className={styles.transcriptPrimary}
                  disabled={busy || transcriptDraft.trim().length < 20}
                  onClick={() => {
                    setTranscriptEditing(false);
                    void run({ text: transcriptDraft.trim() });
                  }}
                >
                  <SparkleIcon width={14} height={14} /> Re-run with edited transcript
                </button>
              </div>
            </>
          ) : (
            <div
              className={`${styles.transcriptBody} ${
                transcriptOpen ? styles.transcriptBodyOpen : ''
              }`}
            >
              {transcript.text}
            </div>
          )}

          <p className={styles.heroMeta}>
            Target: <strong>{TARGET_LABELS[target]}</strong> · Tone: <strong>{tone}</strong>
            {lastProvider && (
              <>
                {' '}
                · captions by: <strong>{lastProvider}</strong>
              </>
            )}
          </p>
        </section>
      )}

      {/* ── Loading shimmer ─────────────────────────────────────────────── */}
      {busy && concepts.length === 0 && (
        <div className={styles.shimmerGrid}>
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className={styles.shimmerCard} />
          ))}
        </div>
      )}

      {/* ── Concept feed ─────────────────────────────────────────────────── */}
      {concepts.length > 0 && (
        <div className={styles.feedGrid}>
          {concepts.map((c) => {
            const r = renders[c.id];
            const formatLabel = MEME_FORMATS[c.format]?.name ?? c.format;
            return (
              <article key={c.id} className={styles.memeCard}>
                <div className={styles.memeImageWrap}>
                  {r?.status === 'ready' ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      className={styles.memeImage}
                      src={r.dataUrl}
                      alt={c.captionEn || c.captionTe || 'meme'}
                    />
                  ) : r?.status === 'error' ? (
                    <div className={styles.memeFallback}>
                      <p>Couldn’t render. {r.error.slice(0, 80)}</p>
                      <button
                        type="button"
                        className={styles.cardGhost}
                        onClick={() => regenerate(c)}
                      >
                        Retry
                      </button>
                    </div>
                  ) : (
                    <div className={styles.memeSkeleton}>
                      <div className={styles.spinner} aria-hidden />
                      <span>Painting meme…</span>
                    </div>
                  )}
                  <span className={styles.formatBadge}>{formatLabel}</span>
                </div>

                <div className={styles.memeBody}>
                  {c.headlineTe && (language === 'te' || language === 'both') && (
                    <p className={styles.memeCaptionTe}>{c.headlineTe}</p>
                  )}
                  {c.headlineEn && (language === 'en' || language === 'both') && (
                    <p className={styles.memeCaptionEn}>{c.headlineEn}</p>
                  )}
                  {c.hashtags?.length > 0 && (
                    <p className={styles.memeHashtags}>
                      {c.hashtags.slice(0, 4).map((h) => (
                        <span key={h} className={styles.memeHashtag}>
                          {h}
                        </span>
                      ))}
                    </p>
                  )}
                  {c.punchline && <p className={styles.memePunch}>“{c.punchline}”</p>}
                  {c.sourceQuote && (
                    <p className={styles.memeSource}>
                      <span>quote</span> {c.sourceQuote}
                    </p>
                  )}
                </div>

                <div className={styles.cardActions}>
                  <button
                    type="button"
                    className={styles.cardPrimary}
                    onClick={() => downloadMeme(c)}
                    disabled={r?.status !== 'ready'}
                  >
                    <DownloadIcon width={15} height={15} /> Download
                  </button>
                  <button
                    type="button"
                    className={styles.cardSecondary}
                    onClick={() => shareMeme(c)}
                    disabled={r?.status !== 'ready'}
                  >
                    Share
                  </button>
                  <button
                    type="button"
                    className={styles.cardGhost}
                    onClick={() => regenerate(c)}
                    disabled={r?.status === 'rendering'}
                  >
                    Re-paint
                  </button>
                  <button
                    type="button"
                    className={styles.cardGhost}
                    onClick={() => openEditor(c)}
                  >
                    Edit
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ── Empty state ─────────────────────────────────────────────────── */}
      {!busy && concepts.length === 0 && (
        <div className={styles.emptyHint}>
          <p>
            Try a press meet, a 30-second short, or a campaign speech. Captions stay grounded in
            what was actually said — humour comes from framing, not fabrication.
          </p>
          <p className={styles.heroMeta}>
            Default language: <strong>{LANGUAGE_LABELS.te}</strong> + English
          </p>
        </div>
      )}
    </div>
  );
}
