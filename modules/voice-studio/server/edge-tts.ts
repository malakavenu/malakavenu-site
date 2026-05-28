/**
 * Edge TTS — Free, unlimited, no-API-key TTS via Microsoft Edge's Read Aloud.
 *
 * Supports Telugu, Hindi, Tamil, Kannada, Malayalam, Bengali, Gujarati,
 * Marathi, Indian English, and many more.
 *
 * Quality: Neural voices, ~85% of Indic Parler-TTS quality.
 * Latency: 1-3 seconds.
 * Cost: $0 forever, no quota.
 */

import { defaultLogger } from '../adapters/logger';

// Voice mapping: language code → Edge TTS voice name
const EDGE_VOICES: Record<string, { female: string; male: string }> = {
  'en-IN': { female: 'en-IN-NeerjaExpressiveNeural', male: 'en-IN-PrabhatNeural' },
  'te-IN': { female: 'te-IN-ShrutiNeural', male: 'te-IN-MohanNeural' },
  'hi-IN': { female: 'hi-IN-SwaraNeural', male: 'hi-IN-MadhurNeural' },
  'ta-IN': { female: 'ta-IN-PallaviNeural', male: 'ta-IN-ValluvarNeural' },
  'bn-IN': { female: 'bn-IN-TanishaaNeural', male: 'bn-IN-BashkarNeural' },
  'mr-IN': { female: 'mr-IN-AarohiNeural', male: 'mr-IN-ManoharNeural' },
  'gu-IN': { female: 'gu-IN-DhwaniNeural', male: 'gu-IN-NiranjanNeural' },
  'kn-IN': { female: 'kn-IN-SapnaNeural', male: 'kn-IN-GaganNeural' },
  'ml-IN': { female: 'ml-IN-SobhanaNeural', male: 'ml-IN-MidhunNeural' },
  'pa-IN': { female: 'pa-IN-GurpreetNeural', male: 'pa-IN-GurpreetNeural' },
  'ur-IN': { female: 'ur-IN-GulNeural', male: 'ur-IN-SalmanNeural' },
  'en-US': { female: 'en-US-JennyNeural', male: 'en-US-GuyNeural' },
  'en-GB': { female: 'en-GB-SoniaNeural', male: 'en-GB-RyanNeural' },
};

export interface EdgeTtsParams {
  text: string;
  language: string;
  voice?: string;
  tone?: string;
}

/**
 * Generate speech using Edge TTS.
 * Always free, no quota, no API key needed.
 */
export async function callEdgeTts(params: EdgeTtsParams): Promise<Buffer> {
  const { text, language, voice, tone } = params;

  const { EdgeTTS } = await import('@andresaya/edge-tts');

  // Pick voice
  const voiceName = resolveEdgeVoice(language, voice);

  const tts = new EdgeTTS();

  // Map tone to rate/pitch adjustments
  const { rate, pitch } = toneToSsml(tone);

  await tts.synthesize(text, voiceName, { rate, pitch });
  const buffer = await tts.toBuffer();

  defaultLogger.info(`Edge TTS generated: ${buffer.length} bytes, voice=${voiceName}`);
  return buffer;
}

// Names treated as male hints. Kept in sync with the client-side
// `MALE_VOICE_HINTS` array in `ui/avatar/presets.ts` so the voice gender
// detection on the panel matches what the server actually resolves.
const MALE_NAME_HINTS = [
  'prakash', 'arjun', 'mohan', 'rohit', 'aman', 'kiran',
  'bashkar', 'manohar', 'niranjan', 'gagan', 'midhun',
  'salman', 'guy', 'ryan', 'adam', 'michael', 'george',
  'valluvar', 'madhur', 'prabhat',
];

function resolveEdgeVoice(language: string, voiceHint?: string): string {
  const voices = EDGE_VOICES[language] ?? EDGE_VOICES['en-IN'];

  if (voiceHint) {
    // Direct Edge voice name passes through unchanged.
    if (voiceHint.includes('Neural')) return voiceHint;
    const lower = voiceHint.toLowerCase();
    // Explicit female keyword wins (checked before generic "male" substring).
    if (lower === 'female' || lower.includes('female')) return voices.female;
    // Kokoro voices follow am_/bm_ (male) and af_/bf_ (female) prefixes.
    if (lower.startsWith('am_') || lower.startsWith('bm_')) return voices.male;
    if (lower.startsWith('af_') || lower.startsWith('bf_')) return voices.female;
    // Generic male keyword or a known male name hint.
    if (lower === 'male' || lower.includes('male')) return voices.male;
    if (MALE_NAME_HINTS.some((h) => lower.includes(h))) return voices.male;
  }

  // Default to female voice — matches the client-side `detectVoiceGender`
  // fallback so the avatar→voice pairing stays consistent end-to-end.
  return voices.female;
}

function toneToSsml(tone?: string): { rate: string; pitch: string } {
  switch (tone) {
    case 'calm': return { rate: '-10%', pitch: '-2Hz' };
    case 'energetic': return { rate: '+15%', pitch: '+3Hz' };
    case 'warm': return { rate: '-5%', pitch: '+1Hz' };
    case 'authoritative': return { rate: '-8%', pitch: '-4Hz' };
    case 'conversational': return { rate: '+5%', pitch: '+0Hz' };
    default: return { rate: '+0%', pitch: '+0Hz' };
  }
}

/**
 * Check if Edge TTS supports a given language.
 */
export function isEdgeTtsSupported(language: string): boolean {
  return language in EDGE_VOICES;
}
