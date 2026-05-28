# Voice Studio — Handoff Reference

## Current State

- **Default mode**: Free stack (Edge TTS narration, OpenVoice V2 clone/convert, MyMemory translation, browser Kokoro for en-US/browser langs)
- **HF Boost**: Opt-in via `VOICE_STUDIO_USE_HF_BOOST=1` env var. Enables ZeroGPU-backed providers (Indic Parler-TTS, IndicF5, Seed-VC, IndicTrans) as first-choice with fallback to free stack on quota exhaustion.

## Key Decisions

| Concern | Free Stack (default) | HF Boost (opt-in) |
|---------|---------------------|-------------------|
| Narration | Edge TTS (unlimited, neural) | Indic Parler-TTS → Edge TTS fallback |
| Clone (en/western) | OpenVoice V2 (CPU-basic) | IndicF5 → OpenVoice V2 fallback |
| Clone (Indic) | Chatterbox (browser) → OpenVoice V2 | IndicF5 → Chatterbox → OpenVoice V2 |
| Voice Convert | OpenVoice V2 | Seed-VC → OpenVoice V2 fallback |
| Translation | MyMemory (browser, free) | IndicTrans → MyMemory fallback |

## File Map

```
modules/voice-studio/
├── config.ts              # Language registry, DEFAULT_CONFIG, PROVIDER_MAP
├── types.ts               # All shared types (Engine, ProviderId, Tier, etc.)
├── index.ts               # Public API exports
├── server/
│   ├── handlers.ts        # Route handlers (narrate, clone, convert, translate)
│   ├── provider-tiers.ts  # pickProviderChain() — builds fallback chain per panel+lang
│   ├── providers.ts       # fallbackChain() execution engine
│   ├── edge-tts.ts        # Edge TTS wrapper (always-free narration)
│   ├── openvoice.ts       # OpenVoice V2 wrapper (CPU-basic, no ZeroGPU)
│   ├── hf-spaces.ts       # HF Boost layer (Parler, IndicF5, Seed-VC, IndicTrans)
│   ├── language-router.ts # Legacy pickModel() — still used for backward compat
│   ├── chunker.ts         # Text chunking for long narrations
│   ├── iso15919.ts        # Romanisation for Telugu/Tamil
│   └── watermark.ts       # AudioSeal (best-effort, model may not be present)
├── client/                # Browser-side engines (Kokoro, Chatterbox, ASR)
├── ui/                    # React components
└── adapters/              # Logger, env, cache, analytics
```

## How to Resume Work

1. **Run typecheck**: `npm run typecheck` from project root
2. **Test narration**: Hit `/api/voice-studio/narrate` with `text` + `language=en-IN` — should always work via Edge TTS
3. **Test HF Boost**: Set `VOICE_STUDIO_USE_HF_BOOST=1` + valid `HF_TOKEN` in `.env.local`, restart dev server
4. **OpenVoice V2**: The space at `myshell-ai-openvoicev2.hf.space` runs on cpu-basic (no ZeroGPU). Its `/info` returns 404 but the space works via `/run/predict` POST or queue/join pattern.
5. **Browser providers**: When handlers return `{ mode: 'browser', provider: '...' }`, the client runs TTS/clone locally (Chatterbox, Kokoro)
6. **QuotaExhaustedError**: HF Boost providers throw this on 429/quota patterns — triggers fallback to next provider in chain
