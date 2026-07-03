import { describe, expect, it } from 'vitest';

import { createTripSchema, updateTripSchema } from './validation';

const validTrip = {
  placeName: 'Kyoto',
  country: 'Japan',
  lat: 35.0116,
  lng: 135.7681,
  dateStart: '2023-04-02',
};

describe('createTripSchema', () => {
  it('accepts a minimal valid trip', () => {
    const result = createTripSchema.safeParse(validTrip);
    expect(result.success).toBe(true);
  });

  it('accepts optional highlight, story, and a valid date range', () => {
    const result = createTripSchema.safeParse({
      ...validTrip,
      dateEnd: '2023-04-11',
      highlight: 'Petals on the river.',
      story: 'A long, warm story.',
    });
    expect(result.success).toBe(true);
  });

  it('rejects latitude outside [-90, 90]', () => {
    expect(createTripSchema.safeParse({ ...validTrip, lat: 120 }).success).toBe(
      false,
    );
  });

  it('rejects longitude outside [-180, 180]', () => {
    expect(
      createTripSchema.safeParse({ ...validTrip, lng: -200 }).success,
    ).toBe(false);
  });

  it('rejects a dateEnd earlier than dateStart', () => {
    expect(
      createTripSchema.safeParse({ ...validTrip, dateEnd: '2023-04-01' })
        .success,
    ).toBe(false);
  });

  it('rejects a malformed date', () => {
    expect(
      createTripSchema.safeParse({ ...validTrip, dateStart: '02-04-2023' })
        .success,
    ).toBe(false);
  });

  it('rejects an empty place name', () => {
    expect(
      createTripSchema.safeParse({ ...validTrip, placeName: '' }).success,
    ).toBe(false);
  });

  it('rejects an overlong highlight', () => {
    expect(
      createTripSchema.safeParse({ ...validTrip, highlight: 'x'.repeat(201) })
        .success,
    ).toBe(false);
  });
});

describe('updateTripSchema', () => {
  it('accepts a partial update', () => {
    const result = updateTripSchema.safeParse({ highlight: 'Updated.' });
    expect(result.success).toBe(true);
  });

  it('rejects an empty update', () => {
    expect(updateTripSchema.safeParse({}).success).toBe(false);
  });

  it('still validates provided fields', () => {
    expect(updateTripSchema.safeParse({ lat: 999 }).success).toBe(false);
  });
});
