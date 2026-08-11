import { SignedPhoto } from '@/lib/photos/dto';
import { processImage } from '@/lib/photos/process';

import { photosApi, putBlob } from './api';

const MAX_DISPLAY_BYTES = 8 * 1024 * 1024;

export type UploadStage = 'processing' | 'uploading' | 'saving';

export type UploadResult =
  { ok: true; photo: SignedPhoto } | { ok: false; error: string };

function failed(error: string): UploadResult {
  return { ok: false, error };
}

export async function uploadPhoto(
  tripId: string,
  file: File,
  onStage: (stage: UploadStage) => void = () => {},
): Promise<UploadResult> {
  onStage('processing');
  const processed = await processImage(file);
  if (processed.displayBlob.size > MAX_DISPLAY_BYTES) {
    return failed('image_too_large');
  }

  onStage('uploading');
  const presign = await photosApi.presign(
    tripId,
    processed.contentType,
    processed.displayBlob.size,
    processed.thumbBlob.size,
  );
  if (!presign.ok || !presign.data) {
    return failed(presign.error ?? 'upload_failed');
  }
  const { displayKey, thumbKey, displayUploadUrl, thumbUploadUrl } =
    presign.data;
  const [displayOk, thumbOk] = await Promise.all([
    putBlob(displayUploadUrl, processed.displayBlob),
    putBlob(thumbUploadUrl, processed.thumbBlob),
  ]);
  if (!displayOk || !thumbOk) {
    return failed('storage_failed');
  }

  onStage('saving');
  const created = await photosApi.createRecord(tripId, {
    displayKey,
    thumbKey,
    width: processed.width,
    height: processed.height,
    takenAt: processed.takenAt,
  });
  if (!created.ok || !created.data) {
    return failed(created.error ?? 'save_failed');
  }
  return { ok: true, photo: created.data.photo };
}
