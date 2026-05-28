/** No-op analytics adapter. Host can inject a real implementation. */
export const defaultAnalytics = {
  track: (_event: string, _props?: Record<string, unknown>) => {
    // no-op
  },
};
