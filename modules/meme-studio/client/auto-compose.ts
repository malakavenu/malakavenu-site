'use client';

import type { Language, LeaderFace, MemeAsset, MemeConcept } from '../types';
import { renderBrandedMeme } from './brand-compositor';

export interface AutoComposeOptions {
  apiBasePath: string;
  basePath: string;
  language: Language | 'both';
  faces: LeaderFace[];
  assets: MemeAsset[];
  /** Optional abort signal (reserved for future async work). */
  signal?: AbortSignal;
}

/**
 * Render a finished YSRCP brand-card from a concept — fully deterministic,
 * draws the @YSRCParty visual chrome (gradient bg, fan watermark, hashtag
 * pills, @handle plate, leader photo slot) entirely on canvas. No slow AI
 * background fetch. Returns a PNG data URL.
 */
export async function autoComposeMeme(
  concept: MemeConcept,
  opts: AutoComposeOptions,
): Promise<string> {
  return renderBrandedMeme(concept, {
    basePath: opts.basePath,
    language: opts.language,
    faces: opts.faces,
    assets: opts.assets,
  });
}
