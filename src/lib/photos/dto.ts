import { photos } from '@/db/schema';

type PhotoRow = typeof photos.$inferSelect;
type SignedPhotoRow = PhotoRow & { displayUrl: string; thumbUrl: string };

export interface SignedPhoto {
  id: string;
  tripId: string;
  width: number;
  height: number;
  takenAt: string | null;
  position: number;
  displayUrl: string;
  thumbUrl: string;
}

export function toSignedPhotoDTO(photo: SignedPhotoRow): SignedPhoto {
  return {
    id: photo.id,
    tripId: photo.tripId,
    width: photo.width,
    height: photo.height,
    takenAt: photo.takenAt ? photo.takenAt.toISOString() : null,
    position: photo.position,
    displayUrl: photo.displayUrl,
    thumbUrl: photo.thumbUrl,
  };
}
