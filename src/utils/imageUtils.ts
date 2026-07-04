/**
 * Compress an image, attempting to meet `maxBytes` by iteratively lowering
 * quality and resizing. Returns a Blob (possibly same as original for
 * non-image types or when compression fails).
 */
export async function compressImage(file: File, maxWidth = 1200, quality = 0.8, maxBytes?: number): Promise<Blob> {
  if (!file.type.startsWith('image/')) return file;

  // Skip SVG and animated GIF to avoid rasterizing
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') return file;

  const imageBitmap = await createImageBitmap(file);
  const origWidth = imageBitmap.width;
  const origHeight = imageBitmap.height;
  let targetWidth = Math.min(maxWidth, origWidth);
  let targetHeight = Math.round(targetWidth * (origHeight / origWidth));

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;

  // Helper to produce a blob with given mime & quality
  const toBlob = (mime: string, q: number) => new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), mime, q);
  });

  // Prefer WebP when available for better compression
  const preferWebP = true;
  const mimeCandidates = preferWebP ? ['image/webp', 'image/jpeg'] : ['image/jpeg', 'image/webp'];

  // Iteratively reduce quality and size until under maxBytes or limits reached
  let currentQuality = quality;
  for (let resizeStep = 0; resizeStep < 6; resizeStep++) {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    ctx.drawImage(imageBitmap, 0, 0, targetWidth, targetHeight);

    for (let qTry = 0; qTry < 6; qTry++) {
      for (const mime of mimeCandidates) {
        // Lower bound for quality
        const q = Math.max(0.25, currentQuality - qTry * 0.12);
        // eslint-disable-next-line no-await-in-loop
        const blob = await toBlob(mime, q);
        if (!blob) continue;
        if (!maxBytes || blob.size <= maxBytes) return blob;
        // If no maxBytes or still too big, continue trying
      }
    }

    // reduce dimensions and try again
    targetWidth = Math.max(200, Math.floor(targetWidth * 0.8));
    targetHeight = Math.max(200, Math.round(targetWidth * (origHeight / origWidth)));
    currentQuality = Math.max(0.35, currentQuality - 0.15);
  }

  // Fallback: return last-compressed blob (best effort) or original file as Blob
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  ctx.drawImage(imageBitmap, 0, 0, targetWidth, targetHeight);
  const fallback = await toBlob('image/jpeg', Math.max(0.3, currentQuality));
  if (fallback) return fallback;
  return file;
}

export default { compressImage };
