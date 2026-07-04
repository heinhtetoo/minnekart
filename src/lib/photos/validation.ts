import { z } from 'zod';

export const presignSchema = z.object({
  contentType: z.literal('image/webp'),
});

export const createPhotoSchema = z.object({
  displayKey: z.string().min(1),
  thumbKey: z.string().min(1),
  width: z.number().int().min(1).max(20000),
  height: z.number().int().min(1).max(20000),
  takenAt: z.iso.datetime().nullish(),
  position: z.number().int().min(0).nullish(),
});

export type CreatePhotoInput = z.infer<typeof createPhotoSchema>;
