import { isPhotoContentType, PhotoContentType } from './content-type';
import { scaledDimensions } from './dimensions';
import { readPhotoExif } from './exif';
import { ImageFormat, sniffImageFormat } from './format';

const DISPLAY_MAX = 2560;
const DISPLAY_QUALITY = 0.82;
const THUMB_MAX = 400;
const THUMB_QUALITY = 0.7;

// Chromium encodes WebP from a canvas; Safari and Firefox silently fall
// back to PNG (huge, quality ignored), so those get JPEG instead. Cached
// after the first encode.
let webpSupported: boolean | null = null;

export interface ProcessedImage {
  displayBlob: Blob;
  thumbBlob: Blob;
  contentType: PhotoContentType;
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

// The sniffed format wins when we have one: Android's file browser often
// reports no MIME type and no extension, which is all isHeic can look at.
async function toDecodableBlob(
  file: File,
  format: ImageFormat | null,
): Promise<Blob> {
  const heic = format === null ? isHeic(file) : format === 'heic';
  if (!heic) {
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

function toBlob(
  canvas: HTMLCanvasElement,
  type: PhotoContentType,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function encodeImage(
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
  let blob: Blob | null = null;
  if (webpSupported !== false) {
    blob = await toBlob(canvas, 'image/webp', quality);
    webpSupported = blob?.type === 'image/webp';
  }
  if (!webpSupported) {
    blob = await toBlob(canvas, 'image/jpeg', quality);
  }
  if (!blob) {
    throw new Error('Could not encode the image.');
  }
  return { blob, width, height };
}

export async function processImage(file: File): Promise<ProcessedImage> {
  const buffer = await file.arrayBuffer();
  const format = sniffImageFormat(buffer);
  const { takenAt } = await readPhotoExif(buffer);
  const decodable = await toDecodableBlob(file, format);
  const bitmap = await createImageBitmap(decodable);
  try {
    const display = await encodeImage(bitmap, DISPLAY_MAX, DISPLAY_QUALITY);
    const thumb = await encodeImage(bitmap, THUMB_MAX, THUMB_QUALITY);
    if (!isPhotoContentType(display.blob.type)) {
      throw new Error('Could not encode the image.');
    }
    return {
      displayBlob: display.blob,
      thumbBlob: thumb.blob,
      contentType: display.blob.type,
      width: display.width,
      height: display.height,
      takenAt,
    };
  } finally {
    bitmap.close();
  }
}
