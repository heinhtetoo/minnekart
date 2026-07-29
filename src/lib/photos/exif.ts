const MAX_LATITUDE = 90;
const MAX_LONGITUDE = 180;

export interface PhotoExif {
  takenAt: string | null;
  lat: number | null;
  lng: number | null;
}

export interface ExifSource {
  parse: (
    data: ArrayBuffer,
    options: Record<string, unknown>,
  ) => Promise<Record<string, unknown> | undefined>;
}

interface Coordinates {
  lat: number;
  lng: number;
}

const EMPTY: PhotoExif = { takenAt: null, lat: null, lng: null };

async function loadExifr(): Promise<ExifSource> {
  return (await import('exifr')) as unknown as ExifSource;
}

function toTakenAt(parsed: Record<string, unknown>): string | null {
  const date = parsed.DateTimeOriginal ?? parsed.CreateDate;
  if (date instanceof Date && !Number.isNaN(date.getTime())) {
    return date.toISOString();
  }
  return null;
}

function inRange(lat: number, lng: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return false;
  }
  if (Math.abs(lat) > MAX_LATITUDE || Math.abs(lng) > MAX_LONGITUDE) {
    return false;
  }
  // Cameras write 0,0 when the fix failed, so treat null island as missing.
  return lat !== 0 || lng !== 0;
}

function fromDegreesMinutesSeconds(
  value: unknown,
  ref: unknown,
): number | null {
  const parts = Array.isArray(value) ? value : [value];
  const [degrees = 0, minutes = 0, seconds = 0] = parts.map(Number);
  if (!Number.isFinite(degrees)) {
    return null;
  }
  const magnitude = degrees + minutes / 60 + seconds / 3600;
  const negative = ref === 'S' || ref === 'W';
  return negative ? -magnitude : magnitude;
}

function toCoordinates(parsed: Record<string, unknown>): Coordinates | null {
  const { latitude, longitude } = parsed;
  if (typeof latitude === 'number' && typeof longitude === 'number') {
    return inRange(latitude, longitude)
      ? { lat: latitude, lng: longitude }
      : null;
  }

  const lat = fromDegreesMinutesSeconds(
    parsed.GPSLatitude,
    parsed.GPSLatitudeRef,
  );
  const lng = fromDegreesMinutesSeconds(
    parsed.GPSLongitude,
    parsed.GPSLongitudeRef,
  );
  if (lat === null || lng === null || !inRange(lat, lng)) {
    return null;
  }
  return { lat, lng };
}

export async function readPhotoExif(
  file: Blob | ArrayBuffer,
  load: () => Promise<ExifSource> = loadExifr,
): Promise<PhotoExif> {
  try {
    const { parse } = await load();
    // One read of one buffer. Handing exifr the Blob makes it read the file
    // itself, and two concurrent reads of the same content:// URI fail on
    // Android, which is how this silently lost every location there.
    const buffer =
      file instanceof ArrayBuffer ? file : await file.arrayBuffer();
    const parsed = await parse(buffer, {
      tiff: true,
      exif: true,
      gps: true,
    });
    if (!parsed) {
      return EMPTY;
    }
    const coordinates = toCoordinates(parsed);
    return {
      takenAt: toTakenAt(parsed),
      lat: coordinates?.lat ?? null,
      lng: coordinates?.lng ?? null,
    };
  } catch {
    return EMPTY;
  }
}
