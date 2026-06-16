import { fetchTranscript } from 'youtube-transcript';
import type { TranscriptResult, TranscriptSegment } from '../types';
import { fetchWithTimeout } from './providers/http';

/** Extract an 11-char YouTube video id from common URL shapes (or a bare id). */
export function parseVideoId(input: string): string | null {
  const raw = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return raw;
  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') {
      const id = url.pathname.slice(1, 12);
      return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }
    if (host.endsWith('youtube.com')) {
      const v = url.searchParams.get('v');
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
      // /shorts/<id>, /embed/<id>, /live/<id>
      const m = url.pathname.match(/\/(?:shorts|embed|live)\/([a-zA-Z0-9_-]{11})/);
      if (m) return m[1];
    }
  } catch {
    // not a URL
  }
  return null;
}

/* ─────────────────────────────────────────────────────────────────────────
 * Optional proxy support.
 *
 * `youtube-transcript` (v1.3.1) already uses YouTube's internal Innertube
 * (ANDROID) API with a watch-page fallback, so it works fine from residential
 * IPs. From cloud / datacenter IPs (Vercel, AWS) YouTube blocks BOTH paths
 * (recaptcha wall + empty caption payloads) regardless of how the request is
 * crafted — that is why captions fetch locally but fail in production.
 *
 * The only reliable fix is to route requests through a residential / rotating
 * HTTP(S) proxy. Set `YOUTUBE_PROXY` (or `YOUTUBE_PROXY_URL`) on the host and
 * every YouTube request below is sent through it.
 * ──────────────────────────────────────────────────────────────────────── */

// `undefined` = not yet resolved, `null` = no proxy configured.
let proxiedFetch: typeof fetch | null | undefined;

async function getProxiedFetch(): Promise<typeof fetch | null> {
  if (proxiedFetch !== undefined) return proxiedFetch;
  const proxyUrl =
    (typeof process !== 'undefined' &&
      (process.env.YOUTUBE_PROXY || process.env.YOUTUBE_PROXY_URL)) ||
    '';
  if (!proxyUrl) {
    proxiedFetch = null;
    return null;
  }
  try {
    const { ProxyAgent } = await import('undici');
    const dispatcher = new ProxyAgent(proxyUrl);
    proxiedFetch = ((input: Parameters<typeof fetch>[0], init?: RequestInit) =>
      // `dispatcher` is a valid undici fetch option, absent from the DOM type.
      fetch(input, { ...(init ?? {}), dispatcher } as RequestInit)) as typeof fetch;
  } catch {
    proxiedFetch = null;
  }
  return proxiedFetch;
}

/* ─────────────────────────────────────────────────────────────────────────
 * Supadata fallback (https://supadata.ai).
 *
 * A hosted transcript API that runs its own (non-datacenter) fetch infra, so it
 * succeeds where direct fetches from Vercel fail. Free tier: 100 transcripts/mo,
 * no credit card. Set `SUPADATA_API_KEY` to enable. Only called when the free
 * library path fails, so local dev never spends credits.
 *
 * `SUPADATA_MODE` (default `native`) controls cost: `native` = 1 credit and
 * only existing captions; `auto`/`generate` = AI transcription (2 credits/min).
 * ──────────────────────────────────────────────────────────────────────── */

interface SupadataChunk {
  text?: string;
  offset?: number;
  duration?: number;
  lang?: string;
}

function mapSupadataChunks(chunks: SupadataChunk[]): TranscriptSegment[] {
  return chunks
    .map((c) => ({
      text: (c.text ?? '').replace(/\s+/g, ' ').trim(),
      offsetSec: (c.offset ?? 0) / 1000,
      durationSec: (c.duration ?? 0) / 1000,
    }))
    .filter((s) => s.text);
}

async function fetchViaSupadata(
  videoId: string,
): Promise<{ segments: TranscriptSegment[]; language?: string } | null> {
  const key = typeof process !== 'undefined' ? process.env.SUPADATA_API_KEY : undefined;
  if (!key) return null;
  const mode =
    (typeof process !== 'undefined' && process.env.SUPADATA_MODE) || 'native';

  const u = new URL('https://api.supadata.ai/v1/transcript');
  u.searchParams.set('url', `https://www.youtube.com/watch?v=${videoId}`);
  u.searchParams.set('text', 'false'); // timestamped chunks
  u.searchParams.set('mode', mode);
  u.searchParams.set('lang', 'te'); // auto-falls back to first available track

  const res = await fetchWithTimeout(
    u.toString(),
    { headers: { 'x-api-key': key } },
    30_000,
  );

  // Large videos (AI mode) return a job id — poll briefly.
  if (res.status === 202) {
    const { jobId } = (await res.json()) as { jobId?: string };
    if (!jobId) return null;
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      const jr = await fetchWithTimeout(
        `https://api.supadata.ai/v1/transcript/${jobId}`,
        { headers: { 'x-api-key': key } },
        30_000,
      );
      if (!jr.ok) continue;
      const jd = (await jr.json()) as {
        status?: string;
        content?: SupadataChunk[] | string;
        lang?: string;
      };
      if (jd.status === 'failed') return null;
      if (jd.status === 'completed' && Array.isArray(jd.content)) {
        const segments = mapSupadataChunks(jd.content);
        return segments.length ? { segments, language: jd.lang } : null;
      }
    }
    return null;
  }

  if (!res.ok) return null;
  const data = (await res.json()) as {
    content?: SupadataChunk[] | string;
    lang?: string;
  };
  if (Array.isArray(data.content)) {
    const segments = mapSupadataChunks(data.content);
    return segments.length ? { segments, language: data.lang } : null;
  }
  if (typeof data.content === 'string' && data.content.trim()) {
    return {
      segments: [{ text: data.content.trim(), offsetSec: 0, durationSec: 0 }],
      language: data.lang,
    };
  }
  return null;
}

/**
 * Fetch a YouTube transcript (Telugu → English → default track). Throws a
 * friendly Error so the caller can surface the "paste raw transcript" fallback.
 */
export async function fetchYoutubeTranscript(url: string): Promise<TranscriptResult> {
  const videoId = parseVideoId(url);
  if (!videoId) {
    throw new Error('Could not find a YouTube video id in that URL.');
  }

  const proxy = await getProxiedFetch();
  const base = proxy ? { fetch: proxy } : {};

  const tryLangs: (string | undefined)[] = ['te', 'en', undefined];
  let segments: TranscriptSegment[] = [];
  let language: string | undefined;
  let lastErr: unknown;

  // 1) Free library path (works on residential IPs / via proxy).
  for (const lang of tryLangs) {
    try {
      const rows = await fetchTranscript(videoId, { ...base, ...(lang ? { lang } : {}) });
      if (rows && rows.length) {
        segments = rows.map((r) => ({
          text: r.text,
          offsetSec: typeof r.offset === 'number' ? r.offset : 0,
          durationSec: typeof r.duration === 'number' ? r.duration : 0,
        }));
        language = rows[0]?.lang;
        break;
      }
    } catch (err) {
      lastErr = err;
    }
  }

  // 2) Supadata fallback (works from cloud hosts when YouTube blocks the server).
  if (!segments.length) {
    try {
      const sd = await fetchViaSupadata(videoId);
      if (sd) {
        segments = sd.segments;
        language = sd.language;
      }
    } catch (err) {
      lastErr = err;
    }
  }

  if (!segments.length) {
    const hasSupadata = typeof process !== 'undefined' && !!process.env.SUPADATA_API_KEY;
    const detail = lastErr instanceof Error ? lastErr.message : '';
    throw new Error(
      'No captions could be fetched for this video. It may have captions disabled, ' +
        'or YouTube is blocking requests from the server (common on cloud hosts like Vercel' +
        (hasSupadata ? '' : ' — set SUPADATA_API_KEY or YOUTUBE_PROXY to fix it') +
        '). Paste the transcript text manually instead.' +
        (detail ? ` (${detail})` : ''),
    );
  }

  // YouTube often mis-detects Telugu audio as Hindi (and auto-captions are
  // rough). Flag anything that isn't Telugu/English so the user can paste a
  // clean transcript for better results. Memes are still generated in Telugu.
  const langCode = (language ?? '').toLowerCase().slice(0, 2);
  const warning =
    langCode && langCode !== 'te' && langCode !== 'en'
      ? `These are auto-captions in "${language}" (not Telugu). YouTube may have mis-detected the language, so the text can be inaccurate. Memes are still written in Telugu — for best accuracy, paste the correct transcript.`
      : undefined;

  return {
    videoId,
    source: 'youtube',
    language,
    segments,
    text: segments.map((s) => s.text).join(' ').replace(/\s+/g, ' ').trim(),
    ...(warning ? { warning } : {}),
  };
}
