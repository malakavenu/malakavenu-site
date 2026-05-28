/** Default logger — uses console. Host can inject structured logging. */
export const defaultLogger = {
  info: (msg: string, meta?: Record<string, unknown>) => {
    console.log(`[voice-studio] ${msg}`, meta ?? '');
  },
  warn: (msg: string, meta?: Record<string, unknown>) => {
    console.warn(`[voice-studio] ${msg}`, meta ?? '');
  },
  error: (msg: string, meta?: Record<string, unknown>) => {
    console.error(`[voice-studio] ${msg}`, meta ?? '');
  },
};
