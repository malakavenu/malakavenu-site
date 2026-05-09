import { defineConfig } from '@playwright/test';

/**
 * Playwright config used solely for recording short marketing demos
 * of the new AI features. NOT a test runner — just a video script.
 *
 * Run via:  npm run demo:record
 *
 * Outputs raw .webm clips into scripts/demo/.artifacts/, which the
 * `demo:gif` script then transcodes to .mp4 and .gif under
 * marketing/demos/.
 */
export default defineConfig({
  testDir: __dirname,
  testMatch: /.*\.demo\.ts$/,
  // Demos are sequential — recording a full chrome window in parallel hammers the GPU.
  workers: 1,
  retries: 0,
  reporter: [['list']],
  outputDir: './.artifacts',
  use: {
    baseURL: process.env.DEMO_BASE_URL ?? 'http://localhost:3000',
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    ignoreHTTPSErrors: true,
    headless: true,
    video: {
      mode: 'on',
      size: { width: 1280, height: 800 },
    },
    actionTimeout: 30_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: { browserName: 'chromium' },
    },
  ],
});
