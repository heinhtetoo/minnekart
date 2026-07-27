// A 210-byte JPEG carrying nothing but an EXIF APP1 segment, so the fixture
// stays readable in source. It encodes DateTimeOriginal 2026:07:27 03:40:14
// and a GPS IFD for 35.0116 N, 135.7681 E (Kyoto).
const GEOTAGGED_JPEG_BASE64 =
  '/9j/4QDMRXhpZgAASUkqAAgAAAADAA4BAgAGAAAAMgAAAGmHBAABAAAAOAAAACWIBAABAAAAXgAA' +
  'AAAAAABwcm9iZQABAAOQAgAUAAAASgAAAAAAAAAyMDI2OjA3OjI3IDAzOjQwOjE0AAQAAQACAAIA' +
  'AABOAAAAAgAFAAMAAACUAAAAAwACAAIAAABFAAAABAAFAAMAAACsAAAAAAAAACMAAAABAAAAAAAA' +
  'AAEAAABQEAAAZAAAAIcAAAABAAAALgAAAAEAAAAEAgAAZAAAAP/Z';

export const GEOTAGGED_LATITUDE = 35.0116;
export const GEOTAGGED_LONGITUDE = 135.7681;
export const GEOTAGGED_TAKEN_AT = '2026:07:27 03:40:14';

export function geotaggedJpeg(): Blob {
  return new Blob([Buffer.from(GEOTAGGED_JPEG_BASE64, 'base64')]);
}

export function strippedJpeg(): Blob {
  return new Blob([Buffer.from([0xff, 0xd8, 0xff, 0xd9])]);
}
