import { z } from 'zod';

import { MAX_PHOTOS_PER_TRIP } from '@/lib/billing/limits';

import { PHOTO_CONTENT_TYPES } from './content-type';

export const presignSchema = z.object({
  contentType: z.enum(PHOTO_CONTENT_TYPES),
});

export const createPhotoSchema = z.object({
  displayKey: z.string().min(1),
  thumbKey: z.string().min(1),
  width: z.number().int().min(1).max(20000),
  height: z.number().int().min(1).max(20000),
  takenAt: z.iso.datetime().nullish(),
  position: z.number().int().min(0).nullish(),
});

export const reorderPhotosSchema = z.object({
  order: z.array(z.uuid()).min(1).max(MAX_PHOTOS_PER_TRIP),
});

export type CreatePhotoInput = z.infer<typeof createPhotoSchema>;
