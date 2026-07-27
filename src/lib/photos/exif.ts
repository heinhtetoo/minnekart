const MAX_LATITUDE = 90;
const MAX_LONGITUDE = 180;

export interface PhotoExif {
  takenAt: string | null;
  lat: number | null;
  lng: number | null;
}

export interface GpsBlock {
  latitude?: number;
  longitude?: number;
}

export interface ExifSource {
  parse: (
    file: Blob,
    fields: string[],
  ) => Promise<Record<string, unknown> | undefined>;
  gps: (file: Blob) => Promise<GpsBlock | undefined>;
}

interface Coordinates {
  lat: number;
  lng: number;
}

async function loadExifr(): Promise<ExifSource> {
  return (await import('exifr')) as unknown as ExifSource;
}

function toTakenAt(parsed: Record<string, unknown> | undefined): string | null {
  const date = parsed?.DateTimeOriginal ?? parsed?.CreateDate;
  if (date instanceof Date && !Number.isNaN(date.getTime())) {
    return date.toISOString();
  }
  return null;
}

function toCoordinates(block: GpsBlock | undefined): Coordinates | null {
  const { latitude, longitude } = block ?? {};
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }
  const lat = latitude as number;
  const lng = longitude as number;
  if (Math.abs(lat) > MAX_LATITUDE || Math.abs(lng) > MAX_LONGITUDE) {
    return null;
  }
  // Cameras write 0,0 when the fix failed, so treat null island as missing.
  if (lat === 0 && lng === 0) {
    return null;
  }
  return { lat, lng };
}

async function readTakenAt(
  file: Blob,
  source: Promise<ExifSource>,
): Promise<string | null> {
  try {
    const { parse } = await source;
    return toTakenAt(await parse(file, ['DateTimeOriginal', 'CreateDate']));
  } catch {
    return null;
  }
}

async function readCoordinates(
  file: Blob,
  source: Promise<ExifSource>,
): Promise<Coordinates | null> {
  try {
    const { gps } = await source;
    return toCoordinates(await gps(file));
  } catch {
    return null;
  }
}

export async function readPhotoExif(
  file: Blob,
  load: () => Promise<ExifSource> = loadExifr,
): Promise<PhotoExif> {
  const source = load();
  const [takenAt, coordinates] = await Promise.all([
    readTakenAt(file, source),
    readCoordinates(file, source),
  ]);
  return {
    takenAt,
    lat: coordinates?.lat ?? null,
    lng: coordinates?.lng ?? null,
  };
}
