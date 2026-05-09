# Marketing demo videos

Eight Playwright-driven scripts that record the new AI features so you have ready-to-post clips — five at desktop 16:10 (LinkedIn / X / blog) and three at mobile 9:16 (Reels / TikTok / Shorts / vertical LinkedIn).

## What gets generated

### Desktop (1280×800, landscape) — `npm run demo`

| File | Length | Best for |
|--|--|--|
| `01-playground-tour.{mp4,gif}` | ~12s | Launch post: "I added an AI playground" |
| `02-generate.{mp4,gif}` | ~25s | Image-gen feature spotlight |
| `03-cmdk-assistant.{mp4,gif}` | ~22s | "AI clone of me" recruiter angle |
| `04-filter-studio.{mp4,gif}` | ~22s | Highest viral potential — browser-side photo edit |
| `05-article-rail.{mp4,gif}` | ~25s | "Every article on my site is interrogable" |

### Mobile (1080×1920, true 9:16) — `npm run demo:mobile`

| File | Length | Best for |
|--|--|--|
| `06-mobile-playground.{mp4,gif}` | ~16s | Reels / TikTok lead clip — browser-side photo edit on phone |
| `07-mobile-launcher.{mp4,gif}` | ~20s | Vertical recruiter pitch — tap launcher → AI clone replies |
| `08-mobile-article-rail.{mp4,gif}` | ~25s | "TL;DR any article" — strong on Reels / Shorts |

Outputs land in `marketing/demos/` (gitignored — share by uploading directly to social).

## Prerequisites

- The dev server must be running at `http://localhost:3000` (or set `DEMO_BASE_URL`).
- `ffmpeg` on PATH (`brew install ffmpeg`).
- For `02-generate.demo.ts` and chat demos, `POLLINATIONS_API_KEY` should be set (otherwise FLUX still works keyless but slower).

One-time setup:

```bash
npm install                     # picks up @playwright/test
npx playwright install chromium # downloads the browser
```

## Running

```bash
# Desktop set
npm run demo                    # record + transcode all 5 desktop demos
npm run demo:record             # record only (writes .webm under scripts/demo/.artifacts/)

# Mobile / vertical set
npm run demo:mobile             # record + transcode all 3 mobile demos (1080×1920)
npm run demo:mobile:record      # record only (writes .webm under .artifacts-mobile/)

# Transcode whichever .webm files exist into mp4 + gif under marketing/demos/
npm run demo:gif
```

The transcoder auto-detects portrait clips and upscales them to the 1080×1920 Reels/TikTok upload spec via lanczos. Landscape clips pass through at the recorded resolution. GIF widths default to 720 (landscape) / 540 (portrait) for sane file sizes.

To record only one:

```bash
# Desktop
npx playwright test --config=scripts/demo/playwright.config.ts \
  scripts/demo/04-filter-studio.demo.ts

# Mobile
npx playwright test --config=scripts/demo/playwright.mobile.config.ts \
  scripts/demo/06-mobile-playground.mobile.demo.ts

npm run demo:gif
```

## Customizing

- **Pacing**: tweak the `PAUSE` constants in `helpers.ts`. They're deliberately slow — real users move slower than tests, and dwell time on key frames is what makes a demo readable.
- **Cursor highlight**: the gradient cursor + click ripples are injected by `installCursorOverlay()` in `helpers.ts`. Edit the CSS there to change colors.
- **Viewport**: `playwright.config.ts` defaults to 1280×800 @ 2× DPI (good for desktop). For phone-form-factor demos, change to `viewport: { width: 390, height: 844 }, deviceScaleFactor: 3` and add `isMobile: true, hasTouch: true`.
- **Demo prompts**: change the strings in each `.demo.ts` to match your launch narrative.

## Tips for posting

- **LinkedIn (feed)**: use the `01–05` desktop clips. Native uploads outperform external links 5-10×. Add captions in the post body since LinkedIn doesn't auto-caption.
- **LinkedIn (vertical video / mobile feed)**: the `06–08` 1080×1920 clips render natively in mobile feeds — better thumb-stop rate than landscape.
- **X/Twitter**: desktop clips for inline previews (<16s plays auto). For longer, post as a video tweet, not link.
- **Instagram Reels / TikTok / YouTube Shorts**: upload the `06–08` mobile mp4s directly — they're already at the correct 1080×1920 spec, so no platform re-encoding shenanigans.
- **WhatsApp**: send the `.mp4` directly. Pair with `https://malakavenu.com/r/whatsapp?to=/playground` so clicks attribute.
- **Markdown / blog**: use the `.gif` for inline previews, `.mp4` for `<video controls>` blocks.
