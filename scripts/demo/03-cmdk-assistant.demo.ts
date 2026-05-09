import { test } from '@playwright/test';
import { PAUSE, installCursorOverlay, settle, typeHuman } from './helpers';

/**
 * Demo 3 — Press Cmd+K from anywhere → ask the AI clone a question →
 * watch the streamed answer. ~22s.
 * Best for: the "AI clone of me" recruiter angle.
 */
test('03-cmdk-assistant', async ({ page }) => {
  test.setTimeout(120_000);
  await installCursorOverlay(page);
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Linger on the homepage so viewers see the surface area first.
  await settle(page, PAUSE.medium);

  // Trigger Cmd+K (mac) — Playwright's `Meta+k` maps to Cmd on darwin.
  await page.keyboard.press('Meta+k');
  await page.locator('[data-assistant-drawer]').waitFor({ state: 'visible' });
  await settle(page, PAUSE.short);

  await typeHuman(
    page,
    '[data-assistant-drawer] textarea',
    'In one sentence — what does Malaka work on?',
    32,
  );
  await settle(page, PAUSE.short);

  await page.locator('[data-assistant-drawer] form button[type="submit"]').first().click();

  // Hold for the streaming reply to render some text.
  await page.waitForTimeout(8_000);
  await settle(page, PAUSE.watch);
});
