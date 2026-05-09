import path from 'node:path';
import { test } from '@playwright/test';
import { PAUSE, installCursorOverlay, pointAndClick, settle } from './helpers';

const SAMPLE = path.resolve(__dirname, '../../public/images/portfolio/img6.jpg');

/**
 * Demo 4 — Filter Studio: upload an image, scroll the filter strip,
 * pick one, hold on the preview. ~22s.
 *
 * The "100% browser-side, no upload" angle is the strongest hook —
 * keep this demo crisp.
 */
test('04-filter-studio', async ({ page }) => {
  test.setTimeout(60_000);
  await installCursorOverlay(page);
  await page.goto('/playground');
  await page.waitForLoadState('networkidle');
  await settle(page, PAUSE.short);

  // Tab label varies ("Edit your image" / "Edit photo"); match by prefix.
  await pointAndClick(page, 'button[role="tab"]:has-text("Edit")');
  await settle(page, PAUSE.short);

  // Edit tab defaults to the "Free filters" sub-mode, so no extra toggle needed.
  // Upload the sample portfolio image directly into the file input.
  await page.locator('input[type="file"]').first().setInputFiles(SAMPLE);
  await page.waitForTimeout(1_500);
  await settle(page, PAUSE.medium);

  // Pick a couple of filters in sequence so viewers see live preview swaps.
  for (const filter of ['Cinematic', 'Vintage', 'Mono']) {
    const btn = page.locator(`button:has-text("${filter}")`).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.scrollIntoViewIfNeeded();
      await btn.click();
      await settle(page, PAUSE.medium);
    }
  }

  // Hold on the final styled preview.
  await settle(page, PAUSE.watch);
});
