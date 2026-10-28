// Client-side in-memory SWR (Stale-While-Revalidate) Cache Manager
// Eliminates redundant network round-trips and guarantees instant UI rendering

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();

export interface FetchOptions {
  ttlMs?: number; // default: 60,000ms (1 minute)
  forceRefresh?: boolean;
}

/**
 * Executes a stale-while-revalidate fetch:
 * 1. Immediately delivers memory-cached data via onData (<0.1ms).
 * 2. If the cache is fresh (< ttlMs), skips network request completely.
 * 3. If stale or absent, triggers background fetch and updates onData when ready.
 */
export async function fetchWithSWR<T>(
  url: string,
  onData: (data: T, isFresh: boolean) => void,
  options?: FetchOptions
): Promise<T | null> {
  const ttlMs = options?.ttlMs ?? 60_000;
  const now = Date.now();
  const cached = memoryCache.get(url);

  if (cached && !options?.forceRefresh) {
    // Immediate delivery from RAM
    onData(cached.data, false);

    // If within fresh TTL, save network bandwidth and return immediately
    if (now - cached.timestamp < ttlMs) {
      return cached.data;
    }
  }

  // Fetch fresh data in background or initial load
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: T = await res.json();

    memoryCache.set(url, {
      data,
      timestamp: Date.now(),
    });

    onData(data, true);
    return data;
  } catch (err) {
    if (cached) {
      return cached.data;
    }
    console.warn(`SWR fetch failed for ${url}:`, err);
    return null;
  }
}

export function getCached<T>(url: string): T | null {
  const entry = memoryCache.get(url);
  return entry ? (entry.data as T) : null;
}

export function setCached<T>(url: string, data: T): void {
  memoryCache.set(url, {
    data,
    timestamp: Date.now(),
  });
}

export function invalidateCache(prefix?: string): void {
  if (!prefix) {
    memoryCache.clear();
    return;
  }
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }
}
