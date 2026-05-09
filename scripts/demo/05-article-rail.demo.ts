import { test } from '@playwright/test';
import { PAUSE, installCursorOverlay, pointAndClick, settle, typeHuman } from './helpers';

/**
 * Demo 5 — Article reading rail: scroll an article, open the
 * scope-locked Q&A drawer from the floating launcher, ask about the
 * post. ~25s.
 *
 * Best for: "every article on my site is interrogable" angle.
 */
test('05-article-rail', async ({ page }) => {
  test.setTimeout(120_000);
  await installCursorOverlay(page);
  await page.goto('/articles/agent-skills-patterns');
  await page.waitForLoadState('networkidle');
  await settle(page, PAUSE.medium);

  // Slow scroll to give viewers a feel for the rail showing up.
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      const target = 1400;
      const start = window.scrollY;
      const dur = 2200;
      const t0 = performance.now();
      const step = (t: number) => {
        const k = Math.min(1, (t - t0) / dur);
        window.scrollTo(0, start + (target - start) * (0.5 - 0.5 * Math.cos(Math.PI * k)));
        if (k < 1) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
  });
  await settle(page, PAUSE.medium);

  // Open the assistant drawer scoped to this article.
  await pointAndClick(page, 'button[aria-label*="Ask"], button.asl-fab, [data-assistant-launcher]');
  await page.locator('[data-assistant-drawer]').waitFor({ state: 'visible' });
  await settle(page, PAUSE.short);

  await typeHuman(
    page,
    '[data-assistant-drawer] textarea',
    'Summarize this article in 2 short sentences.',
    32,
  );
  await settle(page, PAUSE.short);
  await page.locator('[data-assistant-drawer] form button[type="submit"]').first().click();

  await page.waitForTimeout(8_000);
  await settle(page, PAUSE.watch);
});
