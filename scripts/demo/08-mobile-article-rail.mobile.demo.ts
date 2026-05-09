import { test } from '@playwright/test';
import { PAUSE, installCursorOverlay, pointAndClick, settle, typeHuman } from './helpers';

/**
 * Mobile demo 3 — Open an article, scroll, summon the article-scoped
 * Q&A drawer from the floating launcher. ~28s.
 *
 * Best for the "every long-form article on my site is interrogable"
 * angle. Plays especially well on TikTok / Reels where the audience
 * skews "I won't read this, give me the gist".
 */
test('08-mobile-article-rail', async ({ page }) => {
  test.setTimeout(120_000);
  await installCursorOverlay(page);
  await page.goto('/articles/agent-skills-patterns');
  await page.waitForLoadState('networkidle');
  await settle(page, PAUSE.medium);

  // Slow scroll through the first viewport-and-a-half so viewers see
  // the article body + the floating launcher pinned bottom-right.
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      const target = 1200;
      const start = window.scrollY;
      const dur = 2400;
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
  await settle(page, PAUSE.short);

  await pointAndClick(page, 'button.asl-fab, button[aria-label*="Ask"]');
  await page.locator('[data-assistant-drawer]').waitFor({ state: 'visible' });
  await settle(page, PAUSE.short);

  await typeHuman(
    page,
    '[data-assistant-drawer] textarea',
    'TL;DR this article in one sentence.',
    36,
  );
  await settle(page, PAUSE.short);
  await page.locator('[data-assistant-drawer] form button[type="submit"]').first().click();

  await page.waitForTimeout(8_000);
  await settle(page, PAUSE.watch);
});
