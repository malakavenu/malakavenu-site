#!/usr/bin/env node
/**
 * Regenerates public/meme-studio/{faces,assets}/manifest.json from the files
 * currently on disk, so you never have to hand-edit the manifests after
 * dropping in new images.
 *
 *   npm run meme-studio:reindex
 *
 * Faces: each subfolder of faces/ is a leaderId; each image becomes a photo
 * whose expression defaults to the file name (sans extension). Existing
 * names/party/expression overrides in the current manifest are preserved.
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const FACES_DIR = join(ROOT, 'public', 'meme-studio', 'faces');
const ASSETS_DIR = join(ROOT, 'public', 'meme-studio', 'assets');
const IMG = /\.(png|jpe?g|webp|gif|svg)$/i;
const ASSET_CATEGORIES = ['symbols', 'bubbles', 'stickers', 'stamps', 'banners'];

function readJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return fallback;
  }
}

function listImages(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => IMG.test(f) && statSync(join(dir, f)).isFile())
    .sort();
}

function reindexFaces() {
  const manifestPath = join(FACES_DIR, 'manifest.json');
  const prev = readJson(manifestPath, { leaders: [] });
  const prevById = new Map((prev.leaders ?? []).map((l) => [l.leaderId, l]));

  const leaders = [];
  if (existsSync(FACES_DIR)) {
    for (const entry of readdirSync(FACES_DIR)) {
      const dir = join(FACES_DIR, entry);
      if (!statSync(dir).isDirectory()) continue;
      const prevLeader = prevById.get(entry);
      const prevPhotos = new Map((prevLeader?.photos ?? []).map((p) => [p.file, p]));
      const photos = listImages(dir).map((file) => ({
        file,
        expression: prevPhotos.get(file)?.expression ?? file.replace(IMG, ''),
        ...(prevPhotos.get(file)?.sourceUrl ? { sourceUrl: prevPhotos.get(file).sourceUrl } : {}),
      }));
      leaders.push({
        leaderId: entry,
        name: prevLeader?.name ?? entry,
        party: prevLeader?.party ?? '',
        photos,
      });
    }
  }
  writeFileSync(manifestPath, JSON.stringify({ leaders }, null, 2) + '\n');
  console.log(`[meme-studio] faces: ${leaders.length} leader(s) indexed.`);
}

function reindexAssets() {
  const manifestPath = join(ASSETS_DIR, 'manifest.json');
  const prev = readJson(manifestPath, { assets: [] });
  const prevById = new Map((prev.assets ?? []).map((a) => [a.id, a]));

  const assets = [];
  for (const category of ASSET_CATEGORIES) {
    const dir = join(ASSETS_DIR, category);
    for (const file of listImages(dir)) {
      const id = `${category}-${file.replace(IMG, '')}`;
      assets.push({
        id,
        category,
        file,
        tags: prevById.get(id)?.tags ?? [category, file.replace(IMG, '')],
      });
    }
  }
  writeFileSync(manifestPath, JSON.stringify({ assets }, null, 2) + '\n');
  console.log(`[meme-studio] assets: ${assets.length} asset(s) indexed.`);
}

reindexFaces();
reindexAssets();
