export function useSignedSupportUrls(urls: (string | null)[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const u of urls) {
    if (u) map[u] = u;
  }
  return map;
}
