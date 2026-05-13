#!/usr/bin/env node
/**
 * Walks content/articles/*.mdx and emits scripts/bake-audio/articles.json:
 *
 *   [
 *     { "slug": "...", "title": "...", "text": "..." },
 *     ...
 *   ]
 *
 * The Python F5-TTS script (and the Colab notebook) read this file and
 * generate one MP3 per article. We do article enumeration in Node so the
 * exact same `toSpeakable` transform that runs at request time also runs
 * at bake time — pre-baked audio matches the live fallback verbatim.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const ARTICLES_DIR = path.join(ROOT, 'content', 'articles');
const OUTPUT_PATH = path.join(__dirname, 'articles.json');

// F5-TTS produces good audio up to ~3000 chars per chunk. The article
// page hook (useArticleTTS) caps live TTS at MAX_TTS_CHARS=3500 — we
// match that so pre-baked audio doesn't suddenly run *longer* than what
// a returning visitor heard before.
const MAX_TTS_CHARS = 3500;

// Mirrors lib/speakable.ts. Duplicated as plain JS so this script needs
// zero TS toolchain. Keep in sync if you ever change the TS version.
function toSpeakable(mdx) {
  return mdx
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/^\s{0,3}#+\s+/gm, '')
    .replace(/[*_~>]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  const argv = process.argv.slice(2);
  const onlySlugs = argv.length > 0 ? new Set(argv) : null;

  const files = (await fs.readdir(ARTICLES_DIR)).filter((f) => f.endsWith('.mdx'));
  const items = [];

  for (const file of files) {
    const slug = file.replace(/\.mdx$/, '');
    if (onlySlugs && !onlySlugs.has(slug)) continue;

    const raw = await fs.readFile(path.join(ARTICLES_DIR, file), 'utf8');
    const { data, content } = matter(raw);
    if (data?.draft) continue;
    if (!data?.title) continue;

    const speakable = toSpeakable(content).slice(0, MAX_TTS_CHARS);
    const text = `${data.title}. ${speakable}`;
    items.push({ slug, title: data.title, text });
  }

  items.sort((a, b) => a.slug.localeCompare(b.slug));
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(items, null, 2) + '\n', 'utf8');

  const totalChars = items.reduce((sum, it) => sum + it.text.length, 0);
  console.log(`Wrote ${items.length} articles to ${path.relative(ROOT, OUTPUT_PATH)}`);
  console.log(`Total chars to synthesize: ${totalChars.toLocaleString()}`);
  console.log(`Approx total audio at 150 wpm: ~${Math.round(totalChars / 5 / 150)} min`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
