function isMobile(): boolean {
  return /iPad|iPhone|iPod|Android/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

async function shareFile(blob: Blob, filename: string): Promise<boolean> {
  if (!navigator.share || !navigator.canShare) return false;

  const file = new File([blob], filename, { type: blob.type });
  const shareData = { files: [file] };

  if (!navigator.canShare(shareData)) return false;

  try {
    await navigator.share(shareData);
    return true;
  } catch (e: any) {
    if (e.name === 'AbortError') return true;
    return false;
  }
}

export async function downloadFile(url: string, filename: string): Promise<void> {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error('fetch failed');
    const blob = await res.blob();

    if (isMobile()) {
      const shared = await shareFile(blob, filename);
      if (shared) return;
    }

    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    }, 200);
  } catch {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => document.body.removeChild(a), 200);
  }
}

export async function shareUrl(url: string, text?: string): Promise<void> {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error('fetch failed');
    const blob = await res.blob();
    const ext = blob.type.includes('png') ? 'png' : blob.type.includes('mp4') ? 'mp4' : 'bin';
    const file = new File([blob], `file.${ext}`, { type: blob.type });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ text, files: [file] });
      return;
    }
  } catch {}

  if (navigator.share) {
    try {
      await navigator.share({ text, url });
      return;
    } catch {}
  }

  try {
    await navigator.clipboard.writeText(url);
  } catch {
    window.open(url, '_blank');
  }
}
