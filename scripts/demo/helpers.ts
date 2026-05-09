import { Page } from '@playwright/test';

/**
 * Demo helpers. Slow, deliberate, "screen recording" pacing — not test pacing.
 * The goal is footage that reads at 1× speed; real users move slower than tests.
 */

export const PAUSE = {
  beat: 600,
  short: 1000,
  medium: 1800,
  long: 3000,
  watch: 5000,
};

export async function settle(page: Page, ms = PAUSE.beat): Promise<void> {
  await page.waitForTimeout(ms);
}

/**
 * Type into a field at human speed (~30 wpm). Playwright's default
 * `fill()` is instant which looks unnatural in a recording.
 */
export async function typeHuman(
  page: Page,
  selector: string,
  text: string,
  delayMs = 35,
): Promise<void> {
  const el = page.locator(selector).first();
  await el.click();
  await page.waitForTimeout(150);
  await el.type(text, { delay: delayMs });
}

/**
 * Inject a soft cursor highlight + click ripple so viewers can follow
 * where the action is happening. Runs once per page.
 */
export async function installCursorOverlay(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const style = document.createElement('style');
    style.textContent = `
      .__demo_cursor {
        position: fixed; pointer-events: none; z-index: 2147483647;
        width: 22px; height: 22px; border-radius: 50%;
        background: radial-gradient(circle, rgba(124,92,255,0.85) 0%, rgba(34,211,238,0.55) 70%, transparent 100%);
        box-shadow: 0 0 18px 6px rgba(124,92,255,0.35);
        transform: translate(-50%, -50%);
        transition: top 220ms cubic-bezier(.2,.8,.2,1),
                    left 220ms cubic-bezier(.2,.8,.2,1);
      }
      .__demo_ripple {
        position: fixed; pointer-events: none; z-index: 2147483647;
        width: 8px; height: 8px; border-radius: 50%;
        background: rgba(124,92,255,0.4);
        transform: translate(-50%, -50%);
        animation: __demo_ripple_a 700ms ease-out forwards;
      }
      @keyframes __demo_ripple_a {
        from { width: 8px; height: 8px; opacity: 0.7; }
        to   { width: 88px; height: 88px; opacity: 0; }
      }
    `;
    document.head.appendChild(style);

    const cursor = document.createElement('div');
    cursor.className = '__demo_cursor';
    cursor.style.top = '-100px';
    cursor.style.left = '-100px';
    document.body.appendChild(cursor);

    document.addEventListener('mousemove', (e) => {
      cursor.style.left = `${e.clientX}px`;
      cursor.style.top = `${e.clientY}px`;
    });
    document.addEventListener('mousedown', (e) => {
      const r = document.createElement('div');
      r.className = '__demo_ripple';
      r.style.left = `${e.clientX}px`;
      r.style.top = `${e.clientY}px`;
      document.body.appendChild(r);
      setTimeout(() => r.remove(), 720);
    });
  });
}

/**
 * Hover the locator's center for a beat so the cursor visibly arrives,
 * then click. Mimics real on-screen pointer travel.
 */
export async function pointAndClick(page: Page, selector: string): Promise<void> {
  const el = page.locator(selector).first();
  await el.scrollIntoViewIfNeeded();
  const box = await el.boundingBox();
  if (box) {
    await page.mouse.move(
      box.x + box.width / 2,
      box.y + box.height / 2,
      { steps: 18 },
    );
  }
  await page.waitForTimeout(280);
  await el.click();
}
