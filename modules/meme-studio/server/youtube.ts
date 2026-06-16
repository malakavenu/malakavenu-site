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
 * Innertube (YouTube internal API) caption fetch.
 *
 * The `youtube-transcript` library scrapes the public watch page. From cloud /
 * datacenter IPs (Vercel, AWS) YouTube serves a consent/bot wall instead, so
 * that path reports "no captions" even when captions exist. The Innertube
 * ANDROID client below talks to YouTube's own player API and avoids the
 * consent wall, which is far more reliable on serverless hosts.
 * ──────────────────────────────────────────────────────────────────────── */

// Public Innertube key used by the YouTube web/mobile clients.
const INNERTUBE_KEY = 'AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w';
const PLAYER_URL = `https://www.youtube.com/youtubei/v1/player?key=${INNERTUBE_KEY}`;
const ANDROID_UA =
  'com.google.android.youtube/19.09.37 (Linux; U; Android 14) gzip';

interface CaptionTrack {
  baseUrl: string;
  languageCode?: string;
  kind?: string;
  name?: { simpleText?: string; runs?: { text?: string }[] };
}

interface Json3Event {
  tStartMs?: number;
  dDurationMs?: number;
  segs?: { utf8?: string }[];
}

/** Pick the best caption track: prefer Telugu, then English, then anything. */
function pickTrack(tracks: CaptionTrack[]): CaptionTrack | null {
  if (!tracks.length) return null;
  const byLang = (code: string) =>
    tracks.find((t) => (t.languageCode ?? '').toLowerCase().startsWith(code));
  return byLang('te') ?? byLang('en') ?? tracks[0];
}

async function fetchCaptionTracks(videoId: string): Promise<CaptionTrack[]> {
  const res = await fetchWithTimeout(
    PLAYER_URL,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': ANDROID_UA,
        'Accept-Language': 'en-US,en;q=0.9',
      },
      body: JSON.stringify({
        videoId,
        context: {
          client: {
            clientName: 'ANDROID',
            clientVersion: '19.09.37',
            androidSdkVersion: 34,
            hl: 'en',
            gl: 'IN',
          },
        },
      }),
    },
    15_000,
  );
  if (!res.ok) return [];
  const data = (await res.json()) as {
    captions?: {
      playerCaptionsTracklistRenderer?: { captionTracks?: CaptionTrack[] };
    };
  };
  return data.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
}

async function fetchInnertubeTranscript(
  videoId: string,
): Promise<{ segments: TranscriptSegment[]; language?: string } | null> {
  const tracks = await fetchCaptionTracks(videoId);
  const track = pickTrack(tracks);
  if (!track?.baseUrl) return null;

  const url = `${track.baseUrl}${track.baseUrl.includes('?') ? '&' : '?'}fmt=json3`;
  const res = await fetchWithTimeout(
    url,
    { headers: { 'User-Agent': ANDROID_UA, 'Accept-Language': 'en-US,en;q=0.9' } },
    15_000,
  );
  if (!res.ok) return null;

  const data = (await res.json()) as { events?: Json3Event[] };
  const segments: TranscriptSegment[] = (data.events ?? [])
    .filter((e) => Array.isArray(e.segs))
    .map((e) => ({
      text: (e.segs ?? [])
        .map((s) => s.utf8 ?? '')
        .join('')
        .replace(/\s+/g, ' ')
        .trim(),
      offsetSec: (e.tStartMs ?? 0) / 1000,
      durationSec: (e.dDurationMs ?? 0) / 1000,
    }))
    .filter((s) => s.text);

  if (!segments.length) return null;
  return { segments, language: track.languageCode };
}

/** Legacy scraping fallback (works on residential IPs, often blocked on cloud). */
async function fetchLibraryTranscript(
  videoId: string,
): Promise<{ segments: TranscriptSegment[]; language?: string } | null> {
  const tryLangs: (string | undefined)[] = ['te', 'en', undefined];
  for (const lang of tryLangs) {
    try {
      const rows = await fetchTranscript(videoId, lang ? { lang } : undefined);
      if (rows && rows.length) {
        return {
          segments: rows.map((r) => ({
            text: r.text,
            offsetSec: typeof r.offset === 'number' ? r.offset : 0,
            durationSec: typeof r.duration === 'number' ? r.duration : 0,
          })),
          language: rows[0]?.lang,
        };
      }
    } catch {
      // try next language / fall through
    }
  }
  return null;
}

/**
 * Fetch a YouTube transcript. Prefers the Innertube player API (reliable on
 * serverless) and falls back to the scraping library. Throws a friendly Error
 * so the caller can surface the "paste raw transcript" fallback.
 */
export async function fetchYoutubeTranscript(url: string): Promise<TranscriptResult> {
  const videoId = parseVideoId(url);
  if (!videoId) {
    throw new Error('Could not find a YouTube video id in that URL.');
  }

  let result: { segments: TranscriptSegment[]; language?: string } | null = null;
  try {
    result = await fetchInnertubeTranscript(videoId);
  } catch {
    result = null;
  }
  if (!result) {
    try {
      result = await fetchLibraryTranscript(videoId);
    } catch {
      result = null;
    }
  }

  if (!result || !result.segments.length) {
    throw new Error(
      'No captions could be fetched for this video. It may have captions disabled, ' +
        'or YouTube is blocking requests from the server. Paste the transcript text manually instead.',
    );
  }

  const { segments, language } = result;
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
