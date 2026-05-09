import { test } from '@playwright/test';
import { PAUSE, installCursorOverlay, pointAndClick, settle, typeHuman } from './helpers';

/**
 * Mobile demo 2 — Tap the floating launcher → ask the AI clone a
 * question → watch the streamed reply. ~22s.
 *
 * On phones the entry point is the bottom-right pill, not Cmd+K. This
 * is the recruiter-friendly walkthrough.
 */
test('07-mobile-launcher', async ({ page }) => {
  test.setTimeout(120_000);
  await installCursorOverlay(page);
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Linger so viewers see the homepage hero before the assistant appears.
  await settle(page, PAUSE.medium);

  await pointAndClick(page, 'button.asl-fab, button[aria-label*="Ask Malaka"]');
  await page.locator('[data-assistant-drawer]').waitFor({ state: 'visible' });
  await settle(page, PAUSE.short);

  await typeHuman(
    page,
    '[data-assistant-drawer] textarea',
    'What does Malaka work on?',
    36,
  );
  await settle(page, PAUSE.short);
  await page.locator('[data-assistant-drawer] form button[type="submit"]').first().click();

  // Wait for the streamed reply to populate.
  await page.waitForTimeout(8_000);
  await settle(page, PAUSE.watch);
});
