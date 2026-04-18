/**
 * Module-level signed URL cache with TTL + LRU-style eviction.
 * - TTL: 55 min (server signs for 60 min; 5-min safety margin).
 * - Max size: 200 entries (oldest inserted entry evicted on overflow).
 */
const TTL_MS = 55 * 60 * 1000;
const MAX_CACHE_SIZE = 200;

type Entry = { url: string; expiresAt: number };

const cache = new Map<string, Entry>();
const pending = new Map<string, Promise<string>>();

// Optional guest code appended to every request when set (guest sessions).
let guestCode: string | null = null;
export function setGuestCode(code: string | null): void {
  if (guestCode !== code) {
    // Invalidate — cached URLs were fetched under a different auth context.
    cache.clear();
    pending.clear();
  }
  guestCode = code;
}

function isValid(entry: Entry | undefined): entry is Entry {
  return !!entry && entry.expiresAt > Date.now();
}

function setEntry(filePath: string, url: string): void {
  // Re-insert to move to newest in Map iteration order.
  if (cache.has(filePath)) cache.delete(filePath);
  cache.set(filePath, { url, expiresAt: Date.now() + TTL_MS });
  // Evict oldest when exceeding cap.
  while (cache.size > MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey === undefined) break;
    cache.delete(oldestKey);
  }
}

export async function getSignedUrl(filePath: string): Promise<string> {
  const existing = cache.get(filePath);
  if (isValid(existing)) return existing.url;
  if (existing) cache.delete(filePath);

  // Deduplicate concurrent requests for the same path
  if (pending.has(filePath)) return pending.get(filePath)!;

  const qs = new URLSearchParams({ path: filePath });
  if (guestCode) qs.set('guestCode', guestCode);
  const promise = fetch(`/api/signed-url?${qs.toString()}`)
    .then((res) => res.json())
    .then((json) => {
      if (!json.signedUrl) throw new Error(json.error ?? 'Failed to get signed URL');
      setEntry(filePath, json.signedUrl);
      pending.delete(filePath);
      return json.signedUrl as string;
    })
    .catch((err) => {
      pending.delete(filePath);
      throw err;
    });

  pending.set(filePath, promise);
  return promise;
}

/** Prefetch multiple paths in parallel — call on session init */
export function prefetchSignedUrls(filePaths: string[]): void {
  for (const p of filePaths) {
    const cached = cache.get(p);
    if (!isValid(cached) && !pending.has(p)) getSignedUrl(p).catch(() => {});
  }
}

export function getCachedSignedUrl(filePath: string): string | null {
  const entry = cache.get(filePath);
  if (!isValid(entry)) {
    if (entry) cache.delete(filePath);
    return null;
  }
  return entry.url;
}

export function clearSignedUrlCache(): void {
  cache.clear();
  pending.clear();
}
