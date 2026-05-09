import { test } from '@playwright/test';
import { PAUSE, installCursorOverlay, pointAndClick, settle } from './helpers';

/**
 * Demo 1 — 12-second tour of the three playground tabs.
 * Best for: LinkedIn / X "I built this" launch post.
 */
test('01-playground-tour', async ({ page }) => {
  await installCursorOverlay(page);
  await page.goto('/playground');
  await page.waitForLoadState('networkidle');
  await settle(page, PAUSE.medium);

  await pointAndClick(page, 'button[role="tab"]:has-text("Ask Malaka")');
  await settle(page, PAUSE.long);

  await pointAndClick(page, 'button[role="tab"]:has-text("Edit")');
  await settle(page, PAUSE.long);

  await pointAndClick(page, 'button[role="tab"]:has-text("Generate")');
  await settle(page, PAUSE.long);
});
