import { handleTranscript } from '@/modules/meme-studio/server';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';
export const POST = handleTranscript;
