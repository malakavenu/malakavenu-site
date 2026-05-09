#!/usr/bin/env node
// Transcode Playwright's raw .webm captures (under scripts/demo/.artifacts/)
// into shareable assets under marketing/demos/:
//   - <name>.mp4  (LinkedIn / X / WhatsApp; H.264, mobile-safe)
//   - <name>.gif  (Markdown previews, embeds; 720px wide, 14fps)
//
// Requires ffmpeg on PATH. (`brew install ffmpeg` on macOS.)

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const OUT = path.join(ROOT, 'marketing/demos');

// The desktop and mobile configs each write to their own .artifacts dir;
// we transcode whichever ones exist so a partial run still works.
const ARTIFACT_DIRS = [
  path.join(ROOT, 'scripts/demo/.artifacts'),
  path.join(ROOT, 'scripts/demo/.artifacts-mobile'),
];

function findWebms(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...findWebms(p));
    else if (entry.name.endsWith('.webm')) out.push(p);
  }
  return out;
}

/**
 * Playwright stores videos in a generated folder named after the test.
 * We pull a clean name from the parent dir (`<spec>-<project>` → keep
 * the leading numeric prefix so demos sort in run order).
 */
function deriveName(webmPath) {
  const folder = path.basename(path.dirname(webmPath));
  const stem = folder
    .replace(/^.*?(\d{2}-[a-z0-9-]+).*?$/i, '$1')
    .replace(/-chromium-desktop$/, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return stem || folder;
}

function run(cmd, args) {
  const res = spawnSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  if (res.error) throw res.error;
  if (res.status !== 0) {
    const tail = (res.stderr?.toString() ?? '').split('\n').slice(-12).join('\n');
    throw new Error(
      `${cmd} ${args.join(' ')}\nexit=${res.status} signal=${res.signal}\n${tail}`,
    );
  }
}

function probeOrientation(src) {
  const res = spawnSync(
    'ffprobe',
    [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height',
      '-of', 'csv=s=x:p=0',
      src,
    ],
    { encoding: 'utf8' },
  );
  const [w, h] = (res.stdout ?? '').trim().split('x').map(Number);
  return { width: w || 0, height: h || 0, isPortrait: h > w };
}

function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const webms = ARTIFACT_DIRS.flatMap(findWebms);
  if (webms.length === 0) {
    console.error(
      `No .webm files found under any of:\n  ${ARTIFACT_DIRS.join('\n  ')}\n` +
        'Run `npm run demo:record` or `npm run demo:mobile` first.',
    );
    process.exit(1);
  }

  // De-dupe by derived name (Playwright sometimes leaves a per-attempt copy).
  const byName = new Map();
  for (const w of webms) {
    const n = deriveName(w);
    if (!byName.has(n)) byName.set(n, w);
  }

  for (const [name, src] of byName.entries()) {
    const mp4 = path.join(OUT, `${name}.mp4`);
    const gif = path.join(OUT, `${name}.gif`);
    const { isPortrait } = probeOrientation(src);
    console.log(`\n→ ${name}${isPortrait ? '  [portrait → 1080×1920]' : ''}`);
    console.log(`   src: ${path.relative(ROOT, src)}`);

    // 1) MP4 — H.264, +faststart for inline preview, even dimensions
    //    (LinkedIn/Twitter both reject odd-px H.264 streams).
    //    Portrait clips upscale to the 1080×1920 Reels / TikTok / Shorts
    //    upload sweet spot via lanczos. Landscape passes through at the
    //    original resolution.
    const mp4Filter = isPortrait
      ? 'scale=1080:1920:flags=lanczos:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black'
      : 'scale=trunc(iw/2)*2:trunc(ih/2)*2';
    run('ffmpeg', [
      '-y', '-i', src,
      '-c:v', 'libx264',
      '-preset', 'slow',
      '-crf', '20',
      '-pix_fmt', 'yuv420p',
      '-vf', mp4Filter,
      '-movflags', '+faststart',
      '-an',
      mp4,
    ]);

    // 2) GIF — generate-then-use a palette for clean colors at 14fps.
    //    `-update 1` is required by ffmpeg ≥ 7 when writing a single PNG.
    //    Width depends on orientation: 720 for landscape, 540 for portrait
    //    (keeps GIF size manageable while staying readable on phones).
    const gifWidth = isPortrait ? 540 : 720;
    const palette = path.join(OUT, `.palette-${name}.png`);
    run('ffmpeg', [
      '-y', '-i', src,
      '-vf', `fps=14,scale=${gifWidth}:-1:flags=lanczos,palettegen=stats_mode=diff`,
      '-update', '1',
      '-frames:v', '1',
      palette,
    ]);
    run('ffmpeg', [
      '-y', '-i', src, '-i', palette,
      '-lavfi', `fps=14,scale=${gifWidth}:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5`,
      gif,
    ]);
    fs.rmSync(palette, { force: true });

    const sizeMp4 = (fs.statSync(mp4).size / 1024 / 1024).toFixed(2);
    const sizeGif = (fs.statSync(gif).size / 1024 / 1024).toFixed(2);
    console.log(`   mp4: ${path.relative(ROOT, mp4)} (${sizeMp4} MB)`);
    console.log(`   gif: ${path.relative(ROOT, gif)} (${sizeGif} MB)`);
  }

  console.log(`\nDone. ${byName.size} demo(s) under marketing/demos/`);
}

main();
