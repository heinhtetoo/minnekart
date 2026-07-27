import { describe, expect, it, vi } from 'vitest';

import { ExifSource, readPhotoExif } from './exif';

import {
  GEOTAGGED_LATITUDE,
  GEOTAGGED_LONGITUDE,
  geotaggedJpeg,
  strippedJpeg,
} from '../../../test/exif-fixture';

const file = new Blob(['photo']);

function stubExif(parsed: Record<string, unknown> | undefined) {
  return async (): Promise<ExifSource> => ({ parse: async () => parsed });
}

describe('readPhotoExif', () => {
  it('reads the capture date and coordinates from a geotagged photo', async () => {
    const exif = await readPhotoExif(
      file,
      stubExif({
        DateTimeOriginal: new Date('2024-04-02T09:15:00.000Z'),
        latitude: 35.0116,
        longitude: 135.7681,
      }),
    );

    expect(exif).toEqual({
      takenAt: '2024-04-02T09:15:00.000Z',
      lat: 35.0116,
      lng: 135.7681,
    });
  });

  it('reads the file in a single pass', async () => {
    const parse = vi.fn<ExifSource['parse']>(async () => ({
      latitude: 1,
      longitude: 2,
    }));
    const arrayBuffer = vi.spyOn(Blob.prototype, 'arrayBuffer');

    await readPhotoExif(file, async () => ({ parse }));

    expect(parse).toHaveBeenCalledTimes(1);
    expect(arrayBuffer).toHaveBeenCalledTimes(1);
    arrayBuffer.mockRestore();
  });

  it('uses a buffer it is handed without re-reading anything', async () => {
    const parse = vi.fn<ExifSource['parse']>(async () => ({
      latitude: 1,
      longitude: 2,
    }));
    const arrayBuffer = vi.spyOn(Blob.prototype, 'arrayBuffer');

    const exif = await readPhotoExif(new ArrayBuffer(8), async () => ({
      parse,
    }));

    expect(arrayBuffer).not.toHaveBeenCalled();
    expect(exif.lat).toBe(1);
    arrayBuffer.mockRestore();
  });

  it('hands exifr a buffer rather than the blob itself', async () => {
    const parse = vi.fn<ExifSource['parse']>(async () => ({}));

    await readPhotoExif(file, async () => ({ parse }));

    expect(parse.mock.calls[0][0]).toBeInstanceOf(ArrayBuffer);
  });

  it('falls back to CreateDate when DateTimeOriginal is missing', async () => {
    const exif = await readPhotoExif(
      file,
      stubExif({ CreateDate: new Date('2019-11-20T22:00:00.000Z') }),
    );

    expect(exif.takenAt).toBe('2019-11-20T22:00:00.000Z');
  });

  it('derives coordinates from raw degrees when exifr does not compute them', async () => {
    const exif = await readPhotoExif(
      file,
      stubExif({
        GPSLatitude: [35, 0, 41.76],
        GPSLatitudeRef: 'N',
        GPSLongitude: [135, 46, 5.16],
        GPSLongitudeRef: 'E',
      }),
    );

    expect(exif.lat).toBeCloseTo(35.0116, 4);
    expect(exif.lng).toBeCloseTo(135.7681, 4);
  });

  it('applies the southern and western hemisphere references', async () => {
    const exif = await readPhotoExif(
      file,
      stubExif({
        GPSLatitude: [33, 51, 54],
        GPSLatitudeRef: 'S',
        GPSLongitude: [151, 12, 36],
        GPSLongitudeRef: 'W',
      }),
    );

    expect(exif.lat).toBeCloseTo(-33.865, 4);
    expect(exif.lng).toBeCloseTo(-151.21, 4);
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
      stubExif({ latitude: 0, longitude: 0 }),
    );

    expect(exif.lat).toBeNull();
    expect(exif.lng).toBeNull();
  });

  it('rejects a latitude outside the valid range', async () => {
    const exif = await readPhotoExif(
      file,
      stubExif({ latitude: 91, longitude: 12 }),
    );

    expect(exif.lat).toBeNull();
  });

  it('rejects a longitude outside the valid range', async () => {
    const exif = await readPhotoExif(
      file,
      stubExif({ latitude: 12, longitude: -181 }),
    );

    expect(exif.lng).toBeNull();
  });

  it('rejects non-finite coordinates', async () => {
    const exif = await readPhotoExif(
      file,
      stubExif({ latitude: Number.NaN, longitude: 135.7681 }),
    );

    expect(exif.lat).toBeNull();
    expect(exif.lng).toBeNull();
  });

  it('rejects a half-missing coordinate pair', async () => {
    const exif = await readPhotoExif(file, stubExif({ latitude: 35.0116 }));

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

  it('degrades to empty metadata when the photo has no EXIF at all', async () => {
    const exif = await readPhotoExif(file, stubExif(undefined));

    expect(exif).toEqual({ takenAt: null, lat: null, lng: null });
  });

  it('degrades to empty metadata when the parser throws', async () => {
    const exif = await readPhotoExif(file, async () => ({
      parse: async () => {
        throw new Error('corrupt header');
      },
    }));

    expect(exif).toEqual({ takenAt: null, lat: null, lng: null });
  });

  it('degrades to empty metadata when exifr cannot be loaded', async () => {
    const exif = await readPhotoExif(file, async () => {
      throw new Error('chunk load failed');
    });

    expect(exif).toEqual({ takenAt: null, lat: null, lng: null });
  });
});

describe('readPhotoExif against the real exifr', () => {
  it('extracts the coordinates and date from a geotagged jpeg', async () => {
    const exif = await readPhotoExif(geotaggedJpeg());

    expect(exif.lat).toBeCloseTo(GEOTAGGED_LATITUDE, 4);
    expect(exif.lng).toBeCloseTo(GEOTAGGED_LONGITUDE, 4);
    expect(exif.takenAt).not.toBeNull();
  });

  it('reports no location for a jpeg that carries no EXIF', async () => {
    const exif = await readPhotoExif(strippedJpeg());

    expect(exif).toEqual({ takenAt: null, lat: null, lng: null });
  });
});
