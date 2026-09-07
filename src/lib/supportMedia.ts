import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const BUCKET = 'support-attachments';
const SIGNED_TTL_SECONDS = 60 * 60;

const cache = new Map<string, { url: string; expiresAt: number }>();

export function supportStoragePath(url: string): string | null {
  const marker = `/${BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  const raw = url.slice(index + marker.length).split('?')[0];
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export async function signedSupportUrl(url: string): Promise<string | null> {
  const path = supportStoragePath(url);
  if (!path) return url;

  const now = Date.now();
  const cached = cache.get(path);
  if (cached && cached.expiresAt > now) return cached.url;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_TTL_SECONDS);

  if (error || !data?.signedUrl) return null;

  cache.set(path, {
    url: data.signedUrl,
    expiresAt: now + (SIGNED_TTL_SECONDS - 300) * 1000,
  });
  return data.signedUrl;
}

export function useSignedSupportUrls(urls: (string | null | undefined)[]): Record<string, string> {
  const [resolved, setResolved] = useState<Record<string, string>>({});
  const key = urls.filter((u): u is string => !!u).join('|');

  useEffect(() => {
    let cancelled = false;
    const pending = key ? key.split('|') : [];
    if (pending.length === 0) return;

    (async () => {
      const entries = await Promise.all(
        pending.map(async (original) => {
          const signed = await signedSupportUrl(original);
          return signed ? ([original, signed] as const) : null;
        })
      );
      if (cancelled) return;
      setResolved((prev) => {
        const next = { ...prev };
        for (const entry of entries) {
          if (entry) next[entry[0]] = entry[1];
        }
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [key]);

  return resolved;
}
