/** Default env adapter — reads from process.env if available. */
export const defaultEnv = {
  get HF_TOKEN() {
    return typeof process !== 'undefined' ? process.env.HF_TOKEN : undefined;
  },
  get SARVAM_API_KEY() {
    return typeof process !== 'undefined' ? process.env.SARVAM_API_KEY : undefined;
  },
  get ELEVENLABS_API_KEY() {
    return typeof process !== 'undefined' ? process.env.ELEVENLABS_API_KEY : undefined;
  },
};
