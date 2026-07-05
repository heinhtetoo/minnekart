import { scaledDimensions } from './dimensions';

const DISPLAY_MAX = 2560;
const DISPLAY_QUALITY = 0.82;
const THUMB_MAX = 400;
const THUMB_QUALITY = 0.7;

export interface ProcessedImage {
  displayBlob: Blob;
  thumbBlob: Blob;
  width: number;
  height: number;
  takenAt: string | null;
}

export function isHeic(file: File): boolean {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  return (
    type.includes('heic') ||
    type.includes('heif') ||
    name.endsWith('.heic') ||
    name.endsWith('.heif')
  );
}

async function readTakenAt(file: File): Promise<string | null> {
  try {
    const exifr = await import('exifr');
    const parsed = await exifr.parse(file, ['DateTimeOriginal', 'CreateDate']);
    const date = parsed?.DateTimeOriginal ?? parsed?.CreateDate;
    if (date instanceof Date && !Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
    return null;
  } catch {
    return null;
  }
}

async function toDecodableBlob(file: File): Promise<Blob> {
  if (!isHeic(file)) {
    return file;
  }
  const heic2any = (await import('heic2any')).default;
  const converted = await heic2any({
    blob: file,
    toType: 'image/jpeg',
    quality: 0.92,
  });
  return Array.isArray(converted) ? converted[0] : converted;
}

async function encodeWebp(
  bitmap: ImageBitmap,
  max: number,
  quality: number,
): Promise<{ blob: Blob; width: number; height: number }> {
  const { width, height } = scaledDimensions(bitmap.width, bitmap.height, max);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas is not available in this browser.');
  }
  context.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', quality),
  );
  if (!blob) {
    throw new Error('Could not encode the image to WebP.');
  }
  return { blob, width, height };
}

export async function processImage(file: File): Promise<ProcessedImage> {
  const takenAt = await readTakenAt(file);
  const decodable = await toDecodableBlob(file);
  const bitmap = await createImageBitmap(decodable);
  try {
    const display = await encodeWebp(bitmap, DISPLAY_MAX, DISPLAY_QUALITY);
    const thumb = await encodeWebp(bitmap, THUMB_MAX, THUMB_QUALITY);
    return {
      displayBlob: display.blob,
      thumbBlob: thumb.blob,
      width: display.width,
      height: display.height,
      takenAt,
    };
  } finally {
    bitmap.close();
  }
}
