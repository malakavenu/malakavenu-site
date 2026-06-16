import type {
  IdeasRequestBody,
  ImageProviderId,
  MemeConcept,
  TextProviderId,
} from '../../types';

export interface TextProvider {
  id: TextProviderId;
  model: string;
  generateConcepts(body: IdeasRequestBody): Promise<MemeConcept[]>;
}

export interface ImageGenOptions {
  prompt: string;
  width: number;
  height: number;
  transparent?: boolean;
}

export interface ImageGenResult {
  bytes: ArrayBuffer;
  contentType: string;
}

export interface ImageProvider {
  id: ImageProviderId;
  model: string;
  generateImage(opts: ImageGenOptions): Promise<ImageGenResult>;
}

export interface ProviderEnv {
  CURSOR_API_KEY?: string;
  CURSOR_MODEL?: string;
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  POLLINATIONS_API_KEY?: string;
}

export type { MemeConcept, IdeasRequestBody };
