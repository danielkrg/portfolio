import { processImage } from './process-image';
import type { Photo } from '../types';

/**
 * Upload one picked file as a new Photo (issue #8): process it in the browser
 * (downscale, EXIF-strip, HEIC→JPEG) then POST the bytes to the Owner-gated
 * endpoint, which relays them to Cloudinary and returns the created Photo —
 * carrying the dimensions the grid reads Orientation from.
 *
 * Rejects if processing fails, the request errors, or the server declines
 * (e.g. 401 when the session has lapsed), so callers can keep the file in a
 * failed set and leave the gallery untouched.
 */
export async function uploadPhoto(file: File): Promise<Photo> {
  const processed = await processImage(file);

  const body = new FormData();
  // A stable, web-friendly filename; the processed bytes are always JPEG.
  body.append('file', processed, `${stripExtension(file.name) || 'photo'}.jpg`);

  const res = await fetch('/api/photos', {
    method: 'POST',
    credentials: 'include',
    body,
  });
  if (!res.ok) {
    throw new Error(`Upload failed: HTTP ${res.status}`);
  }
  const data = (await res.json()) as { photo?: Photo };
  if (!data.photo) {
    throw new Error('Upload response did not include a photo');
  }
  return data.photo;
}

/** Drop a trailing file extension (`DSCF6913.heic` → `DSCF6913`). */
function stripExtension(name: string): string {
  return name.replace(/\.[^./\\]+$/, '');
}
