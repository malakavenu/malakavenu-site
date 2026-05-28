declare module 'lamejs' {
  export class Mp3Encoder {
    constructor(channels: number, sampleRate: number, bitRate: number);
    encodeBuffer(buffer: Int16Array): Uint8Array;
    flush(): Uint8Array;
  }
}

declare module '@andresaya/edge-tts' {
  export class EdgeTTS {
    synthesize(text: string, voice: string, options?: { rate?: string; pitch?: string }): Promise<void>;
    toBuffer(): Promise<Buffer>;
  }
}

declare module 'wawa-lipsync' {
  export class LipsyncManager {
    connectAudio(element: HTMLAudioElement): void;
    getVisemes(): Float32Array;
    getVolume(): number;
    dispose(): void;
  }
}

declare module 'onnxruntime-web' {
  export class InferenceSession {
    static create(
      path: string,
      options?: { executionProviders?: string[] }
    ): Promise<InferenceSession>;
    run(feeds: Record<string, Tensor>): Promise<Record<string, Tensor>>;
  }

  export class Tensor {
    constructor(type: string, data: ArrayLike<number> | BigInt64Array, dims: number[]);
    data: ArrayBuffer | Float32Array;
  }
}
