/**
 * Module-level signed URL cache.
 * Shared across all components — avoids duplicate fetches for the same file path.
 * URLs are valid for 1 hour (3600s), so cache is safe for the duration of a session.
 */
const cache = new Map<string, string>();
const pending = new Map<string, Promise<string>>();

export async function getSignedUrl(filePath: string): Promise<string> {
  if (cache.has(filePath)) return cache.get(filePath)!;

  // Deduplicate concurrent requests for the same path
  if (pending.has(filePath)) return pending.get(filePath)!;

  const promise = fetch(`/api/signed-url?path=${encodeURIComponent(filePath)}`)
    .then((res) => res.json())
    .then((json) => {
      if (!json.signedUrl) throw new Error(json.error ?? 'Failed to get signed URL');
      cache.set(filePath, json.signedUrl);
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
    if (!cache.has(p) && !pending.has(p)) getSignedUrl(p).catch(() => {});
  }
}

export function getCachedSignedUrl(filePath: string): string | null {
  return cache.get(filePath) ?? null;
}

export function clearSignedUrlCache(): void {
  cache.clear();
  pending.clear();
}
