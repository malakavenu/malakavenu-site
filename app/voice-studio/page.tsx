import type { Metadata } from 'next';
import { VoiceStudio, createVoiceStudioConfig } from '@/modules/voice-studio';

export const metadata: Metadata = {
  title: 'Voice Studio — Free Indian TTS & Voice Cloning',
  description:
    'Free open-source TTS, voice cloning, and speech-to-speech for Indian English, Telugu, and 31 languages. Zero cost, ElevenLabs-quality.',
  openGraph: {
    title: 'Voice Studio',
    description: 'Free Indian-first multilingual voice studio — TTS, cloning, and S2S.',
  },
};

const config = createVoiceStudioConfig({
  basePath: '/voice-studio',
  apiBasePath: '/api/voice-studio',
  defaultLanguage: 'en-IN',
  featuredLanguages: ['en-IN', 'te-IN', 'mix', 'en-US'],
  enabledGroups: ['featured', 'indic', 'browser'],
  enableExperimentalEngines: true,
  useHfBoost: process.env.VOICE_STUDIO_USE_HF_BOOST === '1',
  enableAvatar: true,
  defaultAvatarId: 'aria',
  theme: 'auto',
  adapters: {
    env: {
      HF_TOKEN: process.env.HF_TOKEN,
      SARVAM_API_KEY: process.env.SARVAM_API_KEY,
      ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
    },
  },
});

export default function VoiceStudioPage() {
  return <VoiceStudio config={config} />;
}
