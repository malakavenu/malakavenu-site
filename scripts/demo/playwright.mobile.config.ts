import { defineConfig, devices } from '@playwright/test';

/**
 * Phone-form-factor demo recordings for Instagram Reels, TikTok,
 * YouTube Shorts (and LinkedIn vertical video).
 *
 * 9:16 aspect ratio, iPhone-class viewport, touch + mobile UA so the
 * app renders its mobile chrome (bottom dock, floating launcher, etc.).
 *
 * Run via:  npm run demo:mobile
 *
 * IMPORTANT: this config writes its own outputDir (`.artifacts-mobile/`)
 * so it doesn't collide with the desktop config when both are run.
 */
export default defineConfig({
  testDir: __dirname,
  testMatch: /.*\.mobile\.demo\.ts$/,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  outputDir: './.artifacts-mobile',
  use: {
    // Start from the iPhone 14 Pro profile (touch, mobile UA, retina DPR)
    // but override the viewport to exact 9:16 — Playwright's stock profile
    // is 393×660 which leaves a grey strip when upscaled to 1080×1920.
    // 360×640 is true 9:16 and scales cleanly to 1080×1920 (3× lanczos).
    ...devices['iPhone 14 Pro'],
    viewport: { width: 360, height: 640 },
    baseURL: process.env.DEMO_BASE_URL ?? 'http://localhost:3000',
    headless: true,
    video: {
      mode: 'on',
      size: { width: 360, height: 640 },
    },
    actionTimeout: 30_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'chromium-mobile',
      use: { browserName: 'chromium' },
    },
  ],
});
