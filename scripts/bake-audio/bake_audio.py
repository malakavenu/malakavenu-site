#!/usr/bin/env python3
"""
Local F5-TTS bake — generates one MP3 per article using YOUR voice.

Inputs
------
  scripts/bake-audio/articles.json     — produced by `npm run bake:prepare`
  scripts/bake-audio/voice-sample/*    — your reference voice (15-30s WAV/MP3)
                                          + a `ref_text.txt` containing the
                                          exact transcript of that sample

Output
------
  public/audio/<slug>.mp3              — one file per article (mono, 32kbps)

Usage
-----
  # one-time setup
  python -m venv .venv-tts
  source .venv-tts/bin/activate            # Windows: .venv-tts\\Scripts\\activate
  pip install f5-tts                       # pulls torch + torchaudio + soundfile + pydub
  brew install ffmpeg                      # macOS — Linux: apt install ffmpeg

  # every time you want to bake
  npm run bake:prepare                     # refreshes articles.json from MDX
  python scripts/bake-audio/bake_audio.py  # bakes every article
  python scripts/bake-audio/bake_audio.py --slug agent-skills-patterns
                                           # or just one slug
  python scripts/bake-audio/bake_audio.py --force
                                           # re-bake even if MP3 already exists

Hardware
--------
  GPU strongly recommended (6-8 GB VRAM is enough). Apple Silicon (M-series)
  works via MPS. CPU also works but is ~10x slower (~1 min of audio per
  ~30s of compute on a recent Mac).

Why F5-TTS?
-----------
  Best open-source clone quality as of 2025-2026, MIT licensed, robust to
  consumer-mic samples. Falls back gracefully to lower-VRAM models if you
  set MODEL_NAME below.
"""

from __future__ import annotations
import argparse
import json
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPT_DIR = Path(__file__).resolve().parent
ARTICLES_JSON = SCRIPT_DIR / "articles.json"
VOICE_SAMPLE_DIR = SCRIPT_DIR / "voice-sample"
OUTPUT_DIR = ROOT / "public" / "audio"

# F5-TTS model name — must match a config file under f5_tts/configs/.
# Current releases (v1.x of the pip package) ship F5TTS_v1_Base as the
# best-quality default. Older docs reference 'F5-TTS_v1' (hyphenated)
# which no longer matches a config — using it raises FileNotFoundError
# inside omegaconf. If the install is older, fall back to 'F5TTS_Base'.
MODEL_NAME = "F5TTS_v1_Base"

# Output MP3 settings — 32 kbps mono is plenty for speech and keeps each
# article ~2-3 MB so the audio folder stays committable to git.
MP3_BITRATE = "32k"


def find_reference() -> tuple[Path, str]:
    """Locate the reference WAV/MP3 + its transcript in voice-sample/."""
    audio_candidates = sorted(
        p
        for p in VOICE_SAMPLE_DIR.glob("*")
        if p.suffix.lower() in {".wav", ".mp3", ".m4a", ".ogg", ".flac"}
    )
    if not audio_candidates:
        sys.exit(
            f"\n[!] No reference audio in {VOICE_SAMPLE_DIR}.\n"
            "    Drop a 15-30s WAV/MP3 of you reading aloud + a ref_text.txt\n"
            "    containing the exact transcript. See scripts/bake-audio/README.md.\n"
        )
    ref_audio = audio_candidates[0]

    ref_text_path = VOICE_SAMPLE_DIR / "ref_text.txt"
    if not ref_text_path.exists():
        sys.exit(
            f"\n[!] Missing {ref_text_path}.\n"
            "    Create a ref_text.txt with the EXACT transcript of\n"
            f"    {ref_audio.name}. F5-TTS uses this to align prosody.\n"
        )
    ref_text = ref_text_path.read_text(encoding="utf-8").strip()
    if not ref_text:
        sys.exit(f"[!] {ref_text_path} is empty.")
    return ref_audio, ref_text


def load_articles(filter_slugs: set[str] | None) -> list[dict]:
    if not ARTICLES_JSON.exists():
        sys.exit(
            f"[!] {ARTICLES_JSON} missing.\n"
            "    Run `npm run bake:prepare` first to enumerate articles."
        )
    items = json.loads(ARTICLES_JSON.read_text(encoding="utf-8"))
    if filter_slugs:
        items = [it for it in items if it["slug"] in filter_slugs]
    return items


def main() -> None:
    parser = argparse.ArgumentParser(description="Bake article audio with F5-TTS.")
    parser.add_argument(
        "--slug",
        action="append",
        default=[],
        help="Bake only this slug (repeatable). Default: all articles.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-bake even if the output MP3 already exists.",
    )
    args = parser.parse_args()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    ref_audio, ref_text = find_reference()
    items = load_articles(set(args.slug) if args.slug else None)
    if not items:
        sys.exit("[!] No articles to bake.")

    # Lazy imports so `--help` is instant and so a missing pip install
    # gives a useful error message rather than a stack trace at module
    # import time.
    try:
        import torch  # noqa: F401
        from f5_tts.api import F5TTS  # type: ignore
        from pydub import AudioSegment  # type: ignore
    except ImportError as e:
        sys.exit(
            f"[!] Missing Python deps: {e}\n"
            "    Run: pip install f5-tts pydub\n"
            "    Plus ffmpeg on the system: brew install ffmpeg (macOS)"
        )

    print(f"[i] Loading {MODEL_NAME} (first run downloads ~1.5 GB) …")
    tts = F5TTS(model=MODEL_NAME)
    print(f"[i] Reference voice: {ref_audio.name} ({ref_audio.stat().st_size // 1024} KB)")
    print(f"[i] Articles to bake: {len(items)}")

    for i, item in enumerate(items, 1):
        slug = item["slug"]
        out_path = OUTPUT_DIR / f"{slug}.mp3"
        if out_path.exists() and not args.force:
            print(f"[{i}/{len(items)}] {slug:50}  skip (exists)")
            continue

        text = item["text"]
        print(f"[{i}/{len(items)}] {slug:50}  {len(text)} chars …", end="", flush=True)

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as wav_tmp:
            try:
                tts.infer(
                    ref_file=str(ref_audio),
                    ref_text=ref_text,
                    gen_text=text,
                    file_wave=wav_tmp.name,
                    seed=42,
                )
                # Re-encode WAV → MP3 (mono, MP3_BITRATE) to keep file sizes
                # small enough to ship in the repo.
                audio = AudioSegment.from_wav(wav_tmp.name).set_channels(1)
                audio.export(out_path, format="mp3", bitrate=MP3_BITRATE)
                print(f"  done -> {out_path.relative_to(ROOT)} ({out_path.stat().st_size // 1024} KB)")
            finally:
                Path(wav_tmp.name).unlink(missing_ok=True)

    print(f"\n[✓] All audio in {OUTPUT_DIR.relative_to(ROOT)}/")


if __name__ == "__main__":
    main()
