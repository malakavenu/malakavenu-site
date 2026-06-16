/** Default env adapter — reads from process.env when available (server only). */
export const defaultEnv = {
  get CURSOR_API_KEY() {
    return typeof process !== 'undefined' ? process.env.CURSOR_API_KEY : undefined;
  },
  get CURSOR_MODEL() {
    return typeof process !== 'undefined' ? process.env.CURSOR_MODEL : undefined;
  },
  get OPENAI_API_KEY() {
    return typeof process !== 'undefined' ? process.env.OPENAI_API_KEY : undefined;
  },
  get ANTHROPIC_API_KEY() {
    return typeof process !== 'undefined' ? process.env.ANTHROPIC_API_KEY : undefined;
  },
  get POLLINATIONS_API_KEY() {
    return typeof process !== 'undefined' ? process.env.POLLINATIONS_API_KEY : undefined;
  },
};

const isProd = typeof process !== 'undefined' && process.env.NODE_ENV === 'production';

export const defaultLogger = {
  // Verbose info logs are suppressed in production to keep logs signal-heavy.
  info: (msg: string, meta?: Record<string, unknown>) => {
    if (!isProd) console.log(`[meme-studio] ${msg}`, meta ?? '');
  },
  warn: (msg: string, meta?: Record<string, unknown>) =>
    console.warn(`[meme-studio] ${msg}`, meta ?? ''),
  error: (msg: string, meta?: Record<string, unknown>) =>
    console.error(`[meme-studio] ${msg}`, meta ?? ''),
};
