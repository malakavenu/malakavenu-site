/**
 * AudioSeal watermark stub.
 *
 * The full AudioSeal ONNX model was never vendored. This is a no-op passthrough.
 * To re-enable: vendor the ONNX model from facebook/audioseal on HuggingFace
 * and wire onnxruntime-node for server-side inference.
 */

export async function applyWatermark(audio: Float32Array): Promise<Float32Array> {
  return audio;
}

export async function isWatermarkAvailable(): Promise<boolean> {
  return false;
}
