import { apiRequest, jsonBody } from '@/lib/http/client';
import { SignedPhoto } from '@/lib/photos/dto';

export interface PresignResult {
  displayKey: string;
  thumbKey: string;
  displayUploadUrl: string;
  thumbUploadUrl: string;
}

export interface CreatePhotoInput {
  displayKey: string;
  thumbKey: string;
  width: number;
  height: number;
  takenAt: string | null;
}

export const photosApi = {
  list: (tripId: string) =>
    apiRequest<{ photos: SignedPhoto[] }>(`/api/trips/${tripId}/photos`),
  presign: (tripId: string) =>
    apiRequest<PresignResult>(
      `/api/trips/${tripId}/photos/presign`,
      jsonBody('POST', { contentType: 'image/webp' }),
    ),
  createRecord: (tripId: string, body: CreatePhotoInput) =>
    apiRequest<{ photo: SignedPhoto }>(
      `/api/trips/${tripId}/photos`,
      jsonBody('POST', body),
    ),
  remove: (tripId: string, photoId: string) =>
    apiRequest<{ ok: true }>(`/api/trips/${tripId}/photos/${photoId}`, {
      method: 'DELETE',
    }),
};

export async function putBlob(url: string, blob: Blob): Promise<boolean> {
  // The dev in-memory storage driver seeds the object at presign time and
  // returns a memory:// sentinel the browser can't PUT to — treat as done.
  if (url.startsWith('memory://')) {
    return true;
  }
  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'content-type': 'image/webp' },
      body: blob,
    });
    return response.ok;
  } catch {
    return false;
  }
}
