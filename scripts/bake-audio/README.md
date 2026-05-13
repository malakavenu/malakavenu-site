# Voice-clone article narration — F5-TTS bake

Turn the "Listen to this article" button into **your own voice**, for free.

This folder ships two ways to bake the audio:

| Path | When to use | Setup time | Cost |
|--|--|--|--|
| **Google Colab** (recommended) | You don't have a GPU on your laptop | ~5 min | **$0** — uses Colab's free T4 |
| **Local Python** | You have a GPU (NVIDIA ≥ 6 GB, or Apple Silicon M1+) | ~10 min | $0 — your hardware |

Both produce identical output: one `public/audio/<slug>.mp3` per article, mono 32 kbps, ~2–3 MB each.

## What you do once

### Step A — Record a 15–30 second voice sample

Open your phone's Voice Memos (or any recorder). In a **quiet room**, read the following naturally — your normal speaking voice, not "podcast voice":

> "Hi, I'm Malaka. I'm a frontend architect and AI engineer based in Bangalore. I write about agent skills, MCP servers, and the design systems underneath."

Save the recording. **You'll also need the exact transcript** of what you actually said (so if you ad-libbed a word, transcribe what you actually said, not the script above).

**Quality tips that matter:**

- Quiet room. No fan, no AC, no other voices in the background.
- One mic distance the whole time — don't move closer/away.
- Say the closing sentence with falling intonation — F5-TTS picks up your prosody patterns from the sample.
- 15 seconds is the floor. 30 seconds is the sweet spot. More than 60 seconds doesn't help.

Place the file at `scripts/bake-audio/voice-sample/voice-sample.wav` (or `.mp3` / `.m4a`). Create `scripts/bake-audio/voice-sample/ref_text.txt` with the verbatim transcript. The `voice-sample/` folder is `.gitignore`d so your raw recording never leaves your laptop.

### Step B — Generate the article-text manifest

```bash
npm run bake:prepare
```

That walks `content/articles/*.mdx`, applies the same `toSpeakable` transform the live "Listen" button uses, and writes `scripts/bake-audio/articles.json`. Re-run any time you publish or update an article.

## Path 1 — Bake on Colab (free)

1. Open [`colab-notebook.ipynb`](./colab-notebook.ipynb) in Google Colab.
2. **Runtime → Change runtime type → T4 GPU** → Save.
3. Run cells top to bottom. When the upload prompt appears, select **both** files at once: your `voice-sample.wav` and `articles.json`.
4. Paste the verbatim transcript into the `REF_TEXT` cell.
5. Run the bake cell — ~30–60 sec per article on T4. 30 articles ≈ 30–45 min total.
6. The last cell zips and downloads `audio.zip`.
7. Unzip into `public/audio/`. Commit. Push.

That's it. The article page already plays `/audio/<slug>.mp3` if it exists (see Patch in the next section).

## Path 2 — Bake locally (you have a GPU)

```bash
# one-time setup
python -m venv .venv-tts
source .venv-tts/bin/activate          # Windows: .venv-tts\Scripts\activate
pip install f5-tts pydub
brew install ffmpeg                    # Linux: sudo apt install ffmpeg

# every time
npm run bake:prepare                   # refresh articles.json
python scripts/bake-audio/bake_audio.py
```

Common flags:

```bash
# Bake only one article
python scripts/bake-audio/bake_audio.py --slug agent-skills-patterns

# Re-bake even if the MP3 exists (use after you record a better voice sample)
python scripts/bake-audio/bake_audio.py --force
```

Apple Silicon: F5-TTS uses MPS automatically. ~1 min of audio per ~30s of compute on an M2 Pro.

## How the runtime fallback works

The article hook (`components/assistant/useArticleTTS.ts`) does this on click:

1. **Try** `HEAD /audio/<slug>.mp3` — if 200, play that file directly. **Your voice. No API call. Free.**
2. **Else** fall back to the existing `/api/tts` (Pollinations `nova` voice).
3. **Else** fall back to the browser's built-in `speechSynthesis`.

So slugs you've baked sound like you; slugs you haven't yet still work with the generic voice. Adding a new article is fully optional — the site never breaks if you forget to re-bake.

## How big does `public/audio/` get?

For your current ~30 articles, ~60-90 MB total at 32 kbps mono. Fine to commit to git. If you ever cross ~250 MB:

- Move to Vercel Blob / S3 / Cloudflare R2.
- Or git-LFS the `public/audio/*.mp3` files.

The hook already supports an env override; talk to me when you cross that threshold.

## When to re-bake

| You did | Re-bake? |
|--|--|
| Published a new article | Yes — `npm run bake:prepare && python … --slug <new-slug>` |
| Tiny copy edits to an article | Optional. Stale audio is still your voice. |
| Major rewrite of an article | Yes — `… --slug <slug> --force` |
| Recorded a better voice sample | Yes — re-bake everything: `… --force` |
| Updated `lib/speakable.ts` | Yes — `npm run bake:prepare` then `… --force` |

## Privacy

The reference voice WAV stays in `scripts/bake-audio/voice-sample/`, which is `.gitignore`d. It never leaves your laptop (or your Colab session, which is wiped when the kernel disconnects). Only the *output* MP3s go to git.

## Troubleshooting

- **"No reference audio found"** → your sample isn't in `scripts/bake-audio/voice-sample/`, or its extension isn't `.wav/.mp3/.m4a/.ogg/.flac`.
- **"Missing ref_text.txt"** → create it next to the audio with the verbatim transcript.
- **Output sounds robotic / not like me** → most often the reference sample is too noisy, too short (<10s), or too quiet. Re-record in a quieter room.
- **Output sounds rushed** → add a comma or a period to the ref transcript so the model models a slower pace.
- **CUDA out of memory** → reduce sample to 15s, or use the smaller `E2-TTS_v1` model (set `MODEL_NAME` in `bake_audio.py`).
- **First run takes ages** → F5-TTS downloads ~1.5 GB of weights. Cached for subsequent runs.
