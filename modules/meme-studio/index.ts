// ─── Meme Studio Public API (client + shared) ───────────────────────────────
//
// NOTE: server handlers are intentionally NOT re-exported here. They pull in
// node-only deps (@cursor/sdk, youtube-transcript, node:fs). API routes import
// them directly from './server/handlers' so they never enter the client bundle.

export { MemeStudio } from './ui/MemeStudio';
export {
  createMemeStudioConfig,
  DEFAULT_CONFIG,
  LANGUAGE_LABELS,
  TARGET_LABELS,
  DEFAULT_CURSOR_MODEL,
  DEFAULT_IMAGE_MODEL,
} from './config';
export { LIVE_ATTACK_ISSUES } from './data/knowledge';
export type {
  MemeStudioConfig,
  MemeStudioAdapters,
  Language,
  TargetParty,
  MemeTone,
  MemeFormatId,
  MemeConcept,
  TranscriptResult,
  LeaderFace,
  MemeAsset,
} from './types';
