import { fetchTranscript } from 'youtube-transcript';
import type { TranscriptResult, TranscriptSegment } from '../types';

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

/**
 * Fetch a YouTube transcript. Tries Telugu then English then default track.
 * Throws a friendly Error if no captions are available so the caller can
 * surface the "paste raw transcript" fallback.
 */
export async function fetchYoutubeTranscript(url: string): Promise<TranscriptResult> {
  const videoId = parseVideoId(url);
  if (!videoId) {
    throw new Error('Could not find a YouTube video id in that URL.');
  }

  const tryLangs: (string | undefined)[] = ['te', 'en', undefined];
  let rows: Awaited<ReturnType<typeof fetchTranscript>> | null = null;
  let lastErr: unknown;
  for (const lang of tryLangs) {
    try {
      rows = await fetchTranscript(videoId, lang ? { lang } : undefined);
      if (rows && rows.length) break;
    } catch (err) {
      lastErr = err;
    }
  }

  if (!rows || !rows.length) {
    throw new Error(
      `No captions found for this video. ${
        lastErr instanceof Error ? lastErr.message : ''
      }`.trim(),
    );
  }

  const segments: TranscriptSegment[] = rows.map((r) => ({
    text: r.text,
    offsetSec: typeof r.offset === 'number' ? r.offset : 0,
    durationSec: typeof r.duration === 'number' ? r.duration : 0,
  }));

  const language = rows[0]?.lang;
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
