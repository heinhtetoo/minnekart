import { z } from 'zod';

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'must be a YYYY-MM-DD date')
  .refine((value) => !Number.isNaN(Date.parse(value)), 'must be a real date');

const tripFields = z.object({
  placeName: z.string().trim().min(1).max(120),
  country: z.string().trim().min(1).max(80),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  dateStart: isoDate,
  dateEnd: isoDate.nullish(),
  highlight: z.string().trim().max(200).nullish(),
  story: z.string().trim().max(5000).nullish(),
});

function endNotBeforeStart(data: {
  dateStart?: string;
  dateEnd?: string | null;
}): boolean {
  if (!data.dateStart || !data.dateEnd) {
    return true;
  }
  return data.dateEnd >= data.dateStart;
}

const dateRangeIssue = {
  message: 'dateEnd must not be before dateStart',
  path: ['dateEnd'],
};

export const createTripSchema = tripFields.refine(
  endNotBeforeStart,
  dateRangeIssue,
);

export const updateTripSchema = tripFields
  .extend({ isPublic: z.boolean() })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'at least one field is required',
  })
  .refine(endNotBeforeStart, dateRangeIssue);

export type CreateTripInput = z.infer<typeof createTripSchema>;
export type UpdateTripInput = z.infer<typeof updateTripSchema>;
