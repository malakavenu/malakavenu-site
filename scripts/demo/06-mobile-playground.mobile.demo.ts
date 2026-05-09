import path from 'node:path';
import { test } from '@playwright/test';
import { PAUSE, installCursorOverlay, pointAndClick, settle } from './helpers';

const SAMPLE = path.resolve(__dirname, '../../public/images/portfolio/img6.jpg');

/**
 * Mobile demo 1 — Filter Studio in portrait. ~22s.
 *
 * The "browser-side photo edit, no upload" pitch is even stronger on
 * mobile (people instinctively expect upload friction). Lead Reels /
 * TikTok with this one.
 */
test('06-mobile-playground', async ({ page }) => {
  test.setTimeout(60_000);
  await installCursorOverlay(page);
  await page.goto('/playground');
  await page.waitForLoadState('networkidle');
  await settle(page, PAUSE.short);

  // Tab label varies ("Edit your image" / "Edit photo"); match by prefix.
  await pointAndClick(page, 'button[role="tab"]:has-text("Edit")');
  await settle(page, PAUSE.short);

  await page.locator('input[type="file"]').first().setInputFiles(SAMPLE);
  await page.waitForTimeout(1_500);
  await settle(page, PAUSE.medium);

  for (const filter of ['Cinematic', 'Vintage', 'Mono']) {
    const btn = page.locator(`button:has-text("${filter}")`).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.scrollIntoViewIfNeeded();
      await btn.click();
      await settle(page, PAUSE.medium);
    }
  }

  await settle(page, PAUSE.watch);
});
