import type { LeaderFace } from '../types';

/**
 * Loads the curated leader-face manifest from the public folder.
 * The user populates photos under public/meme-studio/faces/<leaderId>/ and the
 * manifest lists them (regenerate with `npm run meme-studio:reindex`).
 */
export async function loadFaceManifest(basePath = '/meme-studio'): Promise<LeaderFace[]> {
  try {
    const res = await fetch(`${basePath}/faces/manifest.json`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = (await res.json()) as { leaders?: LeaderFace[] } | LeaderFace[];
    const leaders = Array.isArray(data) ? data : (data.leaders ?? []);
    return leaders.filter((l) => l && typeof l.leaderId === 'string');
  } catch {
    return [];
  }
}

/** Absolute public URL for a leader photo. */
export function facePhotoUrl(
  basePath: string,
  leaderId: string,
  file: string,
): string {
  return `${basePath}/faces/${leaderId}/${file}`;
}
