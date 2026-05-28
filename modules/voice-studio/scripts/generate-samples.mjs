#!/usr/bin/env node
/**
 * Generate the bundled preset voice samples used by the Voice Clone picker.
 *
 * Reads `modules/voice-studio/assets/samples/manifest.json`, calls Microsoft
 * Edge TTS (free, no API key) for each entry, and writes the resulting WAVs
 * next to the manifest.
 *
 * Run with `npm run voice-studio:samples`.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SAMPLES_DIR = path.resolve(__dirname, '..', 'assets', 'samples');
const MANIFEST_PATH = path.join(SAMPLES_DIR, 'manifest.json');

const EDGE_VOICES = {
  'en-IN-female': 'en-IN-NeerjaExpressiveNeural',
  'en-IN-male': 'en-IN-PrabhatNeural',
  'te-IN-female': 'te-IN-ShrutiNeural',
  'te-IN-male': 'te-IN-MohanNeural',
  'hi-IN-female': 'hi-IN-SwaraNeural',
  'hi-IN-male': 'hi-IN-MadhurNeural',
  'ta-IN-female': 'ta-IN-PallaviNeural',
  'ta-IN-male': 'ta-IN-ValluvarNeural',
};

async function loadEdgeTts() {
  try {
    const { EdgeTTS } = await import('@andresaya/edge-tts');
    return EdgeTTS;
  } catch (err) {
    console.error(
      '\nFailed to import @andresaya/edge-tts. Make sure dependencies are installed:'
    );
    console.error('  npm install\n');
    throw err;
  }
}

async function synth(EdgeTTS, voice, text, outFile) {
  const tts = new EdgeTTS();
  await tts.synthesize(text, voice, { rate: '+0%', pitch: '+0Hz' });
  const buffer = await tts.toBuffer();
  await fs.writeFile(outFile, buffer);
}

async function main() {
  const raw = await fs.readFile(MANIFEST_PATH, 'utf-8');
  const manifest = JSON.parse(raw);

  const EdgeTTS = await loadEdgeTts();

  const entries = Object.entries(manifest);
  console.log(`\nGenerating ${entries.length} preset voice samples…\n`);

  for (const [id, meta] of entries) {
    const voice = EDGE_VOICES[id];
    if (!voice) {
      console.warn(`  [skip] ${id} — no Edge voice mapped`);
      continue;
    }
    const out = path.join(SAMPLES_DIR, meta.audio);
    process.stdout.write(`  [${id}] ${voice} → ${meta.audio} … `);
    try {
      await synth(EdgeTTS, voice, meta.transcript, out);
      const stat = await fs.stat(out);
      console.log(`OK (${(stat.size / 1024).toFixed(1)} KB)`);
    } catch (err) {
      console.log('FAILED');
      console.error('   ', err?.message ?? err);
    }
  }

  console.log('\nDone. Wavs written to', SAMPLES_DIR);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
