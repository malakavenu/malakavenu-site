#!/usr/bin/env node
/**
 * Download Ready Player Me preset avatars into `public/voice-studio/avatars/`
 * so the Voice Studio can render the 3D speaking avatar without depending on
 * a live network call at page-load time.
 *
 * Run with `npm run voice-studio:avatars`.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const OUT_DIR = path.join(REPO_ROOT, 'public', 'voice-studio', 'avatars');

// Mirror of the preset definitions in `ui/avatar/presets.ts`. Only presets
// with a `remoteUrl` (a live, CORS-friendly GLB host) get downloaded.
//
// Ready Player Me's CDN shut down on 2026-01-31, so we now source GLB avatars
// from the met4citizen/TalkingHead reference repo (CC BY-NC 4.0 — fine for a
// demo studio) via jsDelivr's GitHub mirror, plus the wawa-lipsync example
// avatar via the same path. Both hosts are long-lived and CORS-friendly.
//
// Gender coverage:
//   • brunette.glb   — female, glasses, friendly (TalkingHead repo)
//   • avaturn.glb    — female, long brown hair, polished (TalkingHead repo)
//   • avatarsdk.glb  — male, beard, professional (TalkingHead repo)
//   • wawa demo glb  — female, RPM half-body (wawa-lipsync repo)
const TALKING_HEAD_BASE =
  'https://cdn.jsdelivr.net/gh/met4citizen/TalkingHead@main/avatars';
const WAWA_DEMO_GLB =
  'https://cdn.jsdelivr.net/gh/wass08/wawa-lipsync@main/examples/lipsync-demo/public/models/64f1a714fe61576b46f27ca2.glb';

const AVATARS = [
  { id: 'aria',  remoteUrl: `${TALKING_HEAD_BASE}/brunette.glb` },   // female
  { id: 'kai',   remoteUrl: `${TALKING_HEAD_BASE}/avatarsdk.glb` },  // male
  { id: 'maya',  remoteUrl: `${TALKING_HEAD_BASE}/avaturn.glb` },    // female
  { id: 'rohit', remoteUrl: `${TALKING_HEAD_BASE}/avatarsdk.glb` },  // male (shares Kai's GLB)
];
// `WAWA_DEMO_GLB` is kept available for use as a runtime fallback / future
// extra preset, but not auto-downloaded — its sibling has the same shape rig.
void WAWA_DEMO_GLB;

async function downloadOne({ id, remoteUrl }) {
  const out = path.join(OUT_DIR, `${id}.glb`);
  process.stdout.write(`  [${id}] downloading… `);
  try {
    const res = await fetch(remoteUrl, {
      redirect: 'follow',
      headers: { 'User-Agent': 'voice-studio/1.0 (avatar-fetch)' },
    });
    if (!res.ok) {
      console.log(`FAILED (HTTP ${res.status})`);
      return false;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(out, buf);
    console.log(`OK (${(buf.length / 1024 / 1024).toFixed(2)} MB)`);
    return true;
  } catch (err) {
    console.log('FAILED');
    console.error('   ', err?.message ?? err);
    return false;
  }
}

async function writeManifest(availableIds) {
  const manifestPath = path.join(OUT_DIR, 'manifest.json');
  const body = {
    $comment:
      'Lists locally bundled Ready Player Me GLB avatars. Populated by `npm run voice-studio:avatars`. Empty array means the 3D toggle stays disabled and the studio uses the 2D portrait fallback — no network probes, no 404s.',
    available: availableIds,
    generatedAt: new Date().toISOString(),
  };
  await fs.writeFile(manifestPath, `${JSON.stringify(body, null, 2)}\n`);
  console.log(`\nManifest written: ${manifestPath}`);
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  console.log(`\nDownloading ${AVATARS.length} avatars into ${OUT_DIR}\n`);

  const downloaded = [];
  for (const a of AVATARS) {
    if (await downloadOne(a)) downloaded.push(a.id);
  }

  await writeManifest(downloaded);

  console.log(`\nDone — ${downloaded.length}/${AVATARS.length} avatars downloaded.`);
  if (downloaded.length === 0) {
    console.error(
      '\nNo avatars were downloaded. The 3D toggle will stay disabled and the\n' +
        'studio will use the 2D portrait fallback. You can also bring your own\n' +
        'RPM URL in the picker.'
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
