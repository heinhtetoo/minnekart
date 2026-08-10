import { scaledDimensions } from './dimensions';

const PREVIEW_MAX = 320;
const PREVIEW_QUALITY = 0.7;

function toBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', PREVIEW_QUALITY),
  );
}

// Takes the bytes already read at pick time rather than the File: handing
// createImageBitmap the File would re-read the content:// URI, which is the
// read that fails on Android. Returns null when the browser has no decoder
// for the format — HEIC in Chrome and Firefox — which the caller shows as a
// note. No imageOrientation option, so the preview matches what processImage
// will save.
export async function createPreviewUrl(
  bytes: ArrayBuffer,
): Promise<string | null> {
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(new Blob([bytes]));
    const { width, height } = scaledDimensions(
      bitmap.width,
      bitmap.height,
      PREVIEW_MAX,
    );
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
      return null;
    }
    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await toBlob(canvas);
    return blob ? URL.createObjectURL(blob) : null;
  } catch {
    return null;
  } finally {
    bitmap?.close();
  }
}
