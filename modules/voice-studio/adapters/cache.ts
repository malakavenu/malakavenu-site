/** No-op cache adapter. Host can inject IndexedDB, Redis, etc. */
export const defaultCache = {
  get: async (_key: string): Promise<ArrayBuffer | null> => null,
  set: async (_key: string, _value: ArrayBuffer, _ttlMs?: number): Promise<void> => {
    // no-op
  },
};
