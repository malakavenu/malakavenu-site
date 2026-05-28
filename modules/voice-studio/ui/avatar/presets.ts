/**
 * Avatar preset registry — 3D talking-head avatars with Oculus visemes morph
 * targets and matching default voices per gender.
 *
 * Each preset bundles three concerns the studio needs together:
 *
 *  - `localUrl` / `remoteUrl` — GLB sources. Local files come from
 *    `npm run voice-studio:avatars` (sourced from met4citizen/TalkingHead,
 *    CC BY-NC 4.0). The SpeakingAvatar tries local first, then the remote
 *    jsDelivr mirror as a runtime fallback.
 *
 *  - `gender` — drives auto-selection of a gender-matching TTS voice when
 *    the user switches presets, so picking "Kai" (male avatar) doesn't
 *    leave Aria's female voice playing on his face. See `pickVoiceForPreset`
 *    below for the lookup table per Edge-TTS language.
 *
 *  - `portraitSeed` — stable hash seed for the 2D `AnimatedFace` fallback
 *    that renders while the GLB streams in / when 3D is disabled.
 *
 * Note: Ready Player Me's `models.readyplayer.me` CDN was shut down on
 * 2026-01-31. We source all 3D models from the TalkingHead reference repo
 * via jsDelivr's GitHub mirror, which is long-lived and CORS-friendly.
 */

export interface AvatarPreset {
  id: string;
  name: string;
  gender: 'female' | 'male' | 'neutral';
  /** Local public path — produced by `npm run voice-studio:avatars` */
  localUrl: string;
  /** Remote CDN URL — used as immediate fallback when local isn't bundled */
  remoteUrl: string;
  /** Stable seed for the AnimatedFace portrait — drives skin / hair / accessory */
  portraitSeed: string;
  /** Short tagline shown in the picker */
  tag: string;
}

const TALKING_HEAD_BASE =
  'https://cdn.jsdelivr.net/gh/met4citizen/TalkingHead@main/avatars';

export const AVATAR_PRESETS: AvatarPreset[] = [
  {
    id: 'aria',
    name: 'Aria',
    gender: 'female',
    localUrl: '/voice-studio/avatars/aria.glb',
    remoteUrl: `${TALKING_HEAD_BASE}/brunette.glb`,
    portraitSeed: 'aria-narrator',
    tag: 'Warm narrator',
  },
  {
    id: 'kai',
    name: 'Kai',
    gender: 'male',
    localUrl: '/voice-studio/avatars/kai.glb',
    remoteUrl: `${TALKING_HEAD_BASE}/avatarsdk.glb`,
    portraitSeed: 'kai-anchor',
    tag: 'Confident anchor',
  },
  {
    id: 'maya',
    name: 'Maya',
    gender: 'female',
    localUrl: '/voice-studio/avatars/maya.glb',
    remoteUrl: `${TALKING_HEAD_BASE}/avaturn.glb`,
    portraitSeed: 'maya-storyteller',
    tag: 'Bright storyteller',
  },
  {
    id: 'rohit',
    name: 'Rohit',
    gender: 'male',
    localUrl: '/voice-studio/avatars/rohit.glb',
    // Shares Kai's male GLB — CC-licensed male avatars with Oculus visemes
    // are scarce. Differentiation comes from the voice, not the model.
    remoteUrl: `${TALKING_HEAD_BASE}/avatarsdk.glb`,
    portraitSeed: 'rohit-host',
    tag: 'Friendly host',
  },
];

export function getPreset(id: string): AvatarPreset | undefined {
  return AVATAR_PRESETS.find((p) => p.id === id);
}

/** Default avatar — picked when no `defaultAvatarId` is provided. */
export const DEFAULT_AVATAR_ID = 'aria';

// ─── Voice ↔ avatar gender pairing ────────────────────────────────────────
//
// The TTS panels expose a voice dropdown sourced from `LANGUAGES[lang].voices`
// (config.ts) — those names are human-readable labels that Edge-TTS resolves
// to neural voices via the heuristic in `server/edge-tts.ts`. We replicate the
// male-name detection here so the UI can:
//
//   1. Show ♀ / ♂ tags next to each voice in the dropdown.
//   2. Auto-pick a gender-matching voice when the user switches avatars.
//
// Keep this list in sync with the `male` hints in `server/edge-tts.ts`'s
// `resolveEdgeVoice` (currently: prakash, arjun, mohan + the `male` keyword).

const MALE_VOICE_HINTS = [
  'prakash', 'arjun', 'mohan', 'rohit', 'aman', 'kiran',
  'bashkar', 'manohar', 'niranjan', 'gagan', 'midhun',
  'salman', 'guy', 'ryan', 'adam', 'michael', 'george',
  'valluvar', 'madhur', 'prabhat',
];

export function detectVoiceGender(
  voiceLabel: string
): 'female' | 'male' | 'neutral' {
  if (!voiceLabel) return 'neutral';
  const lower = voiceLabel.toLowerCase();
  if (lower.includes('male') && !lower.includes('female')) return 'male';
  if (lower.includes('female')) return 'female';
  if (lower.startsWith('am_') || lower.startsWith('bm_')) return 'male';
  if (lower.startsWith('af_') || lower.startsWith('bf_')) return 'female';
  if (lower.endsWith('neural') && lower.includes('male')) return 'male';
  if (MALE_VOICE_HINTS.some((h) => lower.includes(h))) return 'male';
  // Default to female — most of the Indic voice lists (Ritu, Roopa, Aditi …)
  // are female and the Edge-TTS resolver also defaults to female.
  return 'female';
}

/**
 * Given the active language's voice list and an avatar preset, return the
 * voice label that best matches the preset's gender, or `''` (= "Auto") if
 * the dropdown is empty / no match exists.
 *
 * Used by panels on avatar change so a male avatar never gets stuck with a
 * female voice (or vice versa) — the classic uncanny mismatch.
 */
export function pickVoiceForPreset(
  voices: readonly string[] | undefined,
  preset: AvatarPreset | undefined
): string {
  if (!voices?.length || !preset || preset.gender === 'neutral') return '';
  const wanted = preset.gender;
  const match = voices.find((v) => detectVoiceGender(v) === wanted);
  return match ?? '';
}

/**
 * Build a per-voice display row showing the gender tag next to the label.
 * Returned as `{ value, label, gender }` triples so the panel can render
 * "Ritu  ♀" / "Prakash  ♂" without re-running detection inline.
 */
export function tagVoicesByGender(
  voices: readonly string[] | undefined
): { value: string; label: string; gender: 'female' | 'male' | 'neutral' }[] {
  if (!voices?.length) return [];
  return voices.map((v) => ({
    value: v,
    label: v,
    gender: detectVoiceGender(v),
  }));
}

