import type { AssetGenRequestBody, AssetGenResponse, MemeAsset } from '../types';

/**
 * Loads the illustration/sticker/symbol manifest from the public folder.
 * Files live under public/meme-studio/assets/<category>/ and are listed in the
 * manifest (regenerate with `npm run meme-studio:reindex`).
 */
export async function loadAssetManifest(basePath = '/meme-studio'): Promise<MemeAsset[]> {
  try {
    const res = await fetch(`${basePath}/assets/manifest.json`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = (await res.json()) as { assets?: MemeAsset[] } | MemeAsset[];
    const assets = Array.isArray(data) ? data : (data.assets ?? []);
    return assets.filter((a) => a && typeof a.id === 'string');
  } catch {
    return [];
  }
}

/** Absolute public URL for an asset. */
export function assetUrl(basePath: string, category: string, file: string): string {
  return `${basePath}/assets/${category}/${file}`;
}

/** Generate an asset with the image model and persist it into the library. */
export async function generateAsset(
  apiBasePath: string,
  body: AssetGenRequestBody,
): Promise<AssetGenResponse> {
  const res = await fetch(`${apiBasePath}/asset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as AssetGenResponse & { error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Asset generation failed.');
  return data;
}
