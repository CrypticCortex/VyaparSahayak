interface CacheEntry {
  data: Map<string, unknown>;
  expiresAt: number;
}

// 30-minute TTL
const TTL_MS = 30 * 60 * 1000;

const store = new Map<string, CacheEntry>();


function sweep(): void {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.expiresAt < now) {
      store.delete(key);
    }
  }
}


function getEntry(jobId: string): CacheEntry {
  sweep();
  let entry = store.get(jobId);
  if (!entry || entry.expiresAt < Date.now()) {
    entry = { data: new Map(), expiresAt: Date.now() + TTL_MS };
    store.set(jobId, entry);
  }
  return entry;
}


export const sessionCache = {
  // Store data by jobId + key (e.g. "parsed", "mapping", "preview")
  set(jobId: string, key: string, data: unknown): void {
    const entry = getEntry(jobId);
    entry.data.set(key, data);
    entry.expiresAt = Date.now() + TTL_MS; // refresh TTL
  },

  // Retrieve typed data by jobId + key
  get<T>(jobId: string, key: string): T | null {
    sweep();
    const entry = store.get(jobId);
    if (!entry || entry.expiresAt < Date.now()) return null;
    const val = entry.data.get(key);
    return (val as T) ?? null;
  },

  // Clear all cached data for a job
  clear(jobId: string): void {
    store.delete(jobId);
  },
};
