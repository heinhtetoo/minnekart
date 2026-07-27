import { describe, expect, it } from 'vitest';

import { ExifSource, GpsBlock, readPhotoExif } from './exif';

const file = new Blob(['photo']);

function stubExif(
  parsed: Record<string, unknown> | undefined,
  gpsBlock?: GpsBlock,
): () => Promise<ExifSource> {
  return async () => ({
    parse: async () => parsed,
    gps: async () => gpsBlock,
  });
}

function failing(message: string): () => Promise<ExifSource> {
  return async () => ({
    parse: async () => {
      throw new Error(message);
    },
    gps: async () => {
      throw new Error(message);
    },
  });
}

describe('readPhotoExif', () => {
  it('reads the capture date and coordinates from a geotagged photo', async () => {
    const exif = await readPhotoExif(
      file,
      stubExif(
        { DateTimeOriginal: new Date('2024-04-02T09:15:00.000Z') },
        { latitude: 35.0116, longitude: 135.7681 },
      ),
    );

    expect(exif).toEqual({
      takenAt: '2024-04-02T09:15:00.000Z',
      lat: 35.0116,
      lng: 135.7681,
    });
  });

  it('falls back to CreateDate when DateTimeOriginal is missing', async () => {
    const exif = await readPhotoExif(
      file,
      stubExif({ CreateDate: new Date('2019-11-20T22:00:00.000Z') }),
    );

    expect(exif.takenAt).toBe('2019-11-20T22:00:00.000Z');
  });

  it('returns null coordinates when the photo has no GPS block', async () => {
    const exif = await readPhotoExif(
      file,
      stubExif({ DateTimeOriginal: new Date('2024-04-02T09:15:00.000Z') }),
    );

    expect(exif.takenAt).toBe('2024-04-02T09:15:00.000Z');
    expect(exif.lat).toBeNull();
    expect(exif.lng).toBeNull();
  });

  it('rejects null-island coordinates as a failed fix', async () => {
    const exif = await readPhotoExif(
      file,
      stubExif({}, { latitude: 0, longitude: 0 }),
    );

    expect(exif.lat).toBeNull();
    expect(exif.lng).toBeNull();
  });

  it('rejects a latitude outside the valid range', async () => {
    const exif = await readPhotoExif(
      file,
      stubExif({}, { latitude: 91, longitude: 12 }),
    );

    expect(exif.lat).toBeNull();
  });

  it('rejects a longitude outside the valid range', async () => {
    const exif = await readPhotoExif(
      file,
      stubExif({}, { latitude: 12, longitude: -181 }),
    );

    expect(exif.lng).toBeNull();
  });

  it('rejects non-finite coordinates', async () => {
    const exif = await readPhotoExif(
      file,
      stubExif({}, { latitude: Number.NaN, longitude: 135.7681 }),
    );

    expect(exif.lat).toBeNull();
    expect(exif.lng).toBeNull();
  });

  it('rejects a half-missing coordinate pair', async () => {
    const exif = await readPhotoExif(file, stubExif({}, { latitude: 35.0116 }));

    expect(exif.lat).toBeNull();
    expect(exif.lng).toBeNull();
  });

  it('ignores an unparseable capture date', async () => {
    const exif = await readPhotoExif(
      file,
      stubExif({ DateTimeOriginal: new Date('not a date') }),
    );

    expect(exif.takenAt).toBeNull();
  });

  it('degrades to empty metadata when the parser throws', async () => {
    const exif = await readPhotoExif(file, failing('corrupt header'));

    expect(exif).toEqual({ takenAt: null, lat: null, lng: null });
  });

  it('degrades to empty metadata when exifr cannot be loaded', async () => {
    const exif = await readPhotoExif(file, async () => {
      throw new Error('chunk load failed');
    });

    expect(exif).toEqual({ takenAt: null, lat: null, lng: null });
  });

  it('still reports the date when only the GPS read fails', async () => {
    const exif = await readPhotoExif(file, async () => ({
      parse: async () => ({
        DateTimeOriginal: new Date('2024-04-02T09:15:00.000Z'),
      }),
      gps: async () => {
        throw new Error('no gps ifd');
      },
    }));

    expect(exif.takenAt).toBe('2024-04-02T09:15:00.000Z');
    expect(exif.lat).toBeNull();
  });
});
