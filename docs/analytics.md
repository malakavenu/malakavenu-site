# Analytics

All custom events flow through `lib/track.ts` → Vercel Analytics. Switching providers (Plausible, PostHog, GA4) is a one-file change.

## How deep can Vercel Analytics go?

Vercel Analytics has **two products**, both already enabled in this repo:

| Product | What it captures | Where it shows |
|--|--|--|
| **Web Analytics** (`@vercel/analytics`) | Page views + custom events with up to 10 string/number/boolean props each. Pricing tiers cap monthly events. | Vercel dashboard → *Analytics* tab |
| **Speed Insights** (`@vercel/speed-insights`) | Real-user Core Web Vitals (LCP, INP, CLS, FCP, TTFB) per route, by device type. | Vercel dashboard → *Speed Insights* tab |

### What Vercel Analytics is good at
- **Page views** with referrer, country, device, OS, browser — bucketed and aggregated.
- **Custom events** with structured properties (already used heavily — see below).
- **Funnels** (Pro plan): chain custom events into conversion funnels.
- **Filters**: every dashboard view filters by event property values.
- **Web Vitals attribution** (Speed Insights): "your LCP is 3.2s, p75 element is `img.hero`" type insights.

### Where it has limits (and the workaround)
- **No user-level cohorting** — Vercel deliberately does not set client IDs. If you need *"users who viewed article A then opened the assistant"*, route those events into PostHog or use the `mv_attr` cookie + your own session join.
- **30 unique event-name budget** is generous but not infinite — keep names canonical (`playground_*`, `assistant_*`, etc.).
- **Property values are sliced/diced as strings** — keep cardinality reasonable. Don't put full prompts (we slice to 80 chars in starters).

## Event catalogue

The following events are emitted across the app today. All respect Do-Not-Track and the `mv_track_opt_out=1` opt-out cookie.

### Page-level
| Event | When | Properties |
|--|--|--|
| `page_view` | Every route change | `path`, `attr_source`, `attr_utm_source`, `attr_referrer_host` |
| `referral_visit` | Server-side from `/r/[source]` | `source`, `to`, `utm_medium`, `utm_campaign` |

### Assistant (site-wide drawer + ⌘K + article rail)
| Event | Properties |
|--|--|
| `assistant_open` | `scope` (`site`/`article`), `source` (`launcher`/`prompt_card`/`article_rail`/`cmd_k`), `slug` (article only) |
| `assistant_close` | `method` (`x`/`backdrop`/`esc`/`cmd_k`/`programmatic`), `scope`, `slug` |
| `assistant_starter_click` | `scope`, `index`, `starter` (first 80 chars) |
| `playground_chat_send` | `scope`, `len`, `source` (`input`/`starter`/`initial`), `turn` |
| `playground_chat_first_token` | `scope`, `ms` (TTFB latency from send to first stream token) |
| `playground_chat_success` | `scope`, `chars`, `ms` (full reply latency) |
| `playground_chat_error` | `message` |

### Article reading rail (TTS + share)
| Event | Properties |
|--|--|
| `article_view` | `slug`, `title`, `topic`, `author`, `attr_*` |
| `article_depth` | `slug`, `percent` (25/50/75/100) |
| `article_completed` | `slug`, `dwell_ms` |
| `article_listen_start` | `slug` |
| `article_listen_success` | `slug`, `source` (`remote`/`browser`), `fallback_reason?` |
| `article_listen_error` | `slug`, `message` |
| `share_click` | `channel` (`x`/`linkedin`/`whatsapp`/`facebook`/`copy`), `slug` |

### Playground — Generate
| Event | Properties |
|--|--|
| `playground_tab_switch` | `from`, `to` |
| `playground_enhance_prompt` | `len` |
| `playground_generate` | `model`, `count`, `prompt_len` |
| `playground_generate_success` | `model`, `count`, `ms` |
| `playground_generate_error` | `model`, `message` |
| `playground_image_download` | `model`, `index`, `of` |

### Playground — Edit (Filter Studio + AI restyle)
| Event | Properties |
|--|--|
| `playground_edit_upload` | `bytes`, `type`, `mode` |
| `playground_edit_mode_switch` | `from` (`ai`/`filter`), `to` |
| `playground_edit_start` | `prompt_len` |
| `playground_edit_success` | `provider`, `ms` |
| `playground_edit_error` | `message` |
| `playground_filter_select` | `filter` |
| `playground_filter_download` | `ext`, `filter` |
| `playground_bg_remove_start` | — |
| `playground_bg_remove_success` | — |
| `playground_bg_remove_error` | `message` |

### Other
| Event | Properties |
|--|--|
| `hero_flip` | `state` |
| `resume_download` | `location` (`hero_card`/`header`/`mobile_dock`) |
| `topic_filter` | `topic`, `location` |
| `outbound_click` | `channel`, `location` |
| `contact_submit` / `contact_fail` | `attr_*` / `reason` |

## Suggested dashboards (Vercel → Analytics → "Filter")

1. **Assistant funnel**
   - `assistant_open` → `playground_chat_send` → `playground_chat_success`
   - Filter by `scope=site` vs `scope=article` to see how article context changes engagement.
2. **Image generation conversion**
   - `playground_generate` → `playground_generate_success` → `playground_image_download`
3. **Edit-tab adoption**
   - `playground_tab_switch where to=edit` → `playground_edit_upload` → split by `mode=filter` vs `mode=ai`
4. **Inbound channel breakdown**
   - Filter `page_view` by `attr_utm_source` — surfaces WhatsApp / LinkedIn / direct-search splits.
5. **Chat performance**
   - `playground_chat_first_token.ms` p50/p95 — track LLM TTFB regressions.

## WhatsApp attribution

WhatsApp strips the `Referer` header on link previews and clicks, so visitors arrive looking "direct". This codebase solves that with the `/r/[source]` short-link redirector:

- Article share button now wraps the article URL through `https://malakavenu.com/r/whatsapp?to=/articles/<slug>`.
- The redirector adds `?utm_source=whatsapp&src=whatsapp` to the final URL, captured by `AttributionBoot` into the 30-day `mv_attr` cookie.
- A server-side `referral_visit` event fires before redirect, so traffic counts even if the user bounces before client-side analytics mounts.

To track any new WhatsApp campaign, share `https://malakavenu.com/r/whatsapp?to=/path&c=<campaign-name>` — the `c=` param maps to `utm_campaign`.

You can confirm WhatsApp traffic in Vercel Analytics by:
- Filtering `page_view` events where `attr_utm_source = whatsapp`
- Or filtering `referral_visit` events where `source = whatsapp`
