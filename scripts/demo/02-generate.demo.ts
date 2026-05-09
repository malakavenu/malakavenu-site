import { test } from '@playwright/test';
import { PAUSE, installCursorOverlay, pointAndClick, settle, typeHuman } from './helpers';

/**
 * Demo 2 — "Type a prompt → get 4 free AI images". ~25s.
 * Best for: top-of-funnel social posts; the "no signup" angle.
 *
 * Uses a deterministic prompt so the result is consistently good-looking.
 */
test('02-generate', async ({ page }) => {
  test.setTimeout(120_000);
  await installCursorOverlay(page);
  await page.goto('/playground');
  await page.waitForLoadState('networkidle');
  await settle(page, PAUSE.short);

  await typeHuman(
    page,
    'textarea',
    'A neon-lit Tokyo street at dusk, cinematic, ultra-detailed, photorealistic',
    28,
  );
  await settle(page, PAUSE.short);

  // Click the form-submit "Generate" button (not the tab of the same name).
  // Submitting via Enter from the textarea is more reliable when the button
  // label may be reused as a tab label.
  await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/api/generate-image') && r.status() === 200,
      { timeout: 90_000 },
    ),
    pointAndClick(page, 'form button[type="submit"]:has-text("Generate")'),
  ]);

  // Result image alts are derived from the prompt; wait for any <img> with
  // an alt containing our deterministic keyword.
  await page.locator('img[alt*="Tokyo" i]').first().waitFor({
    state: 'visible',
    timeout: 30_000,
  });

  // Hold on the rendered grid so viewers can read the result.
  await settle(page, PAUSE.watch);
});
