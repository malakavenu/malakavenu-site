# Voice Studio Module

Free, Indian-first multilingual voice studio with four panels:

1. **News Reader** — Text-to-Speech (Indic Parler-TTS + Kokoro)
2. **Voice Clone** — Clone any voice with 5–15s reference (IndicF5 / Praxy R6)
3. **Voice Convert** — Speech-to-Speech timbre transfer (Seed-VC)
4. **Translate & Speak** — Translate between Indian languages and narrate (IndicTrans3)

## Quick Start

### Drop into any Next.js app

1. Copy `modules/voice-studio/` into your project
2. Add the page shim:

```tsx
// app/(site)/voice-studio/page.tsx
import { VoiceStudio, createVoiceStudioConfig } from '@/modules/voice-studio';

const config = createVoiceStudioConfig({
  basePath: '/voice-studio',
  apiBasePath: '/api/voice-studio',
  defaultLanguage: 'en-IN',
});

export default function VoiceStudioPage() {
  return <VoiceStudio config={config} />;
}
```

3. Add the 4 route handlers:

```ts
// app/api/voice-studio/narrate/route.ts
import { handleNarrate } from '@/modules/voice-studio';
export const runtime = 'nodejs';
export const maxDuration = 60;
export const POST = handleNarrate;
```

Repeat for `/clone`, `/convert`, `/translate`.

4. Install dependencies:

```bash
npm install @huggingface/transformers @huggingface/inference @gradio/client kokoro-js lamejs
```

5. (Optional) Set `HF_TOKEN` in `.env.local` for higher rate limits.

## Adding a Language

Edit `config.ts` → `LANGUAGES` registry. Each entry specifies:
- `newsReader`: which TTS provider to use
- `clone`: which cloning engine(s) are available
- `voices`: preset voice names

## Architecture

```
Browser
  ├── Language Picker (4 featured chips + 31-language dropdown)
  ├── Kokoro-82M (in-browser TTS for en-US/UK/JA/ZH/KO/ES/FR/PT/IT)
  └── Whisper Large v3 Turbo (auto-transcription for clone reference)

Server (Next.js route handlers)
  ├── /api/voice-studio/narrate    → Indic Parler-TTS via HF Space
  ├── /api/voice-studio/clone      → IndicF5 or Praxy R6 via HF Space
  ├── /api/voice-studio/convert    → Seed-VC via HF Space
  └── /api/voice-studio/translate  → IndicTrans3 → Indic Parler-TTS
```

## Cost

**$0 forever** for v1. All models run on free HF Spaces.

Optional paid upgrades (documented, not built):
- Sarvam Bulbul v3: ~₹30 per 10K chars (set `SARVAM_API_KEY`)
- ElevenLabs: premium en-US/UK (set `ELEVENLABS_API_KEY`)

## Supported Languages (31)

**Featured:** English (Indian), Telugu, Code-mix, English (US)

**Indic (20):** Hindi, Tamil, Bengali, Marathi, Gujarati, Kannada, Malayalam, Punjabi, Odia, Assamese, Urdu, Nepali, Sanskrit, Konkani, Maithili, Bodo, Dogri, Manipuri, Santali, Sindhi

**Browser (8):** English (UK), Japanese, Mandarin, Korean, Spanish, French, Portuguese, Italian
