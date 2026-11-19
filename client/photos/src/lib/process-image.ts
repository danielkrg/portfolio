/**
 * Browser-side image preparation for upload (issue #8). Every file the Owner
 * picks is brought to a web-friendly, privacy-safe, size-capped form *before it
 * leaves the browser*:
 *
 *  - HEIC/HEIF (what phones shoot) is decoded to a JPEG the server and browsers
 *    can actually display.
 *  - The image is downscaled so its long edge is at most {@link MAX_EDGE}px,
 *    keeping it well under Cloudinary's 10 MB free-tier cap (ADR-0001).
 *  - Re-encoding through a <canvas> drops ALL EXIF metadata — including GPS —
 *    since a canvas bitmap carries no metadata to begin with. The camera's EXIF
 *    orientation is baked into the pixels first (see `decode`), so a phone photo
 *    still shows upright without the rotation tag it just lost.
 *
 * Orientation itself is not computed here: it's derived downstream from the
 * dimensions Cloudinary returns (GLOSSARY: Orientation).
 */

/** Longest edge, in pixels, a processed image is scaled down to. */
export const MAX_EDGE = 2560;

/** Output encoding for processed images. JPEG re-encode is what strips EXIF. */
export const OUTPUT_TYPE = 'image/jpeg';

/** JPEG quality for the processed output (0–1). */
export const OUTPUT_QUALITY = 0.85;

/**
 * Fit (width, height) within a `maxEdge`-by-`maxEdge` box, preserving aspect
 * ratio and only ever shrinking. Already-small images are returned unchanged
 * (rounded). Pure and deterministic, so it carries the unit tests for the
 * resize rule.
 */
export function fitWithin(
  width: number,
  height: number,
  maxEdge: number = MAX_EDGE,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) {
    return { width: Math.round(width), height: Math.round(height) };
  }
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * A quick, synchronous guess at whether a file is HEIC/HEIF, from its type or
 * extension. Phones sometimes report an empty MIME type, so this is only a hint
 * for the UI's `accept` filter and fast paths; {@link decode} relies on the
 * byte-sniffing `isHeic` for the real decision.
 */
export function isHeicLike(file: { name: string; type: string }): boolean {
  const type = file.type.toLowerCase();
  if (type === 'image/heic' || type === 'image/heif') return true;
  return /\.(heic|heif)$/i.test(file.name);
}

/**
 * Decode a picked file into an upright {@link ImageBitmap}. HEIC/HEIF is routed
 * through heic-to first (browsers can't decode it natively); everything else is
 * decoded directly. `imageOrientation: 'from-image'` applies the EXIF rotation
 * so the bitmap's pixels are already upright before we re-encode and lose the
 * tag.
 */
async function decode(file: File): Promise<ImageBitmap> {
  let source: Blob = file;
  // Only reach for the (heavy) HEIC decoder when the file looks like HEIC, so
  // ordinary web images never pay for it. The byte-sniffing `isHeic` then
  // confirms before we convert, so a mislabeled `.heic` that is really a JPEG
  // still decodes directly.
  if (isHeicLike(file)) {
    const { heicTo, isHeic } = await import('heic-to');
    if (await isHeic(file)) {
      source = await heicTo({ blob: file, type: OUTPUT_TYPE, quality: 0.92 });
    }
  }
  return createImageBitmap(source, { imageOrientation: 'from-image' });
}

/**
 * Prepare a picked file for upload: decode (HEIC included), downscale to
 * {@link MAX_EDGE}, and re-encode as a metadata-free JPEG. Resolves to the
 * processed {@link Blob} the server relays to Cloudinary.
 *
 * Browser-only (canvas + createImageBitmap); the pure resize/detect rules above
 * carry the unit tests.
 */
export async function processImage(file: File): Promise<Blob> {
  const bitmap = await decode(file);
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get a 2D canvas context');
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, OUTPUT_TYPE, OUTPUT_QUALITY),
    );
    if (!blob) throw new Error('Canvas failed to encode the image');
    return blob;
  } finally {
    bitmap.close();
  }
}
