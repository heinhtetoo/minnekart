export type ImageFormat = 'jpeg' | 'png' | 'webp' | 'gif' | 'heic' | 'avif';

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const HEIC_BRANDS = ['heic', 'heix', 'heim', 'heis', 'hevc', 'mif1', 'msf1'];
const AVIF_BRANDS = ['avif', 'avis'];

// Reads short so a truncated buffer simply fails to match rather than
// matching on bytes that are not there.
function textAt(header: Uint8Array, offset: number, length: number): string {
  if (header.length < offset + length) {
    return '';
  }
  return String.fromCharCode(...header.subarray(offset, offset + length));
}

function startsWith(header: Uint8Array, signature: number[]): boolean {
  if (header.length < signature.length) {
    return false;
  }
  return signature.every((byte, index) => header[index] === byte);
}

export function sniffImageFormat(buffer: ArrayBuffer): ImageFormat | null {
  const header = new Uint8Array(buffer);

  if (startsWith(header, [0xff, 0xd8, 0xff])) {
    return 'jpeg';
  }
  if (startsWith(header, PNG_SIGNATURE)) {
    return 'png';
  }
  if (textAt(header, 0, 4) === 'GIF8') {
    return 'gif';
  }
  if (textAt(header, 0, 4) === 'RIFF' && textAt(header, 8, 4) === 'WEBP') {
    return 'webp';
  }

  // HEIC and AVIF are ISO base media containers: a box length, then 'ftyp',
  // then the brand that says which flavour it is.
  if (textAt(header, 4, 4) === 'ftyp') {
    const brand = textAt(header, 8, 4);
    if (HEIC_BRANDS.includes(brand)) {
      return 'heic';
    }
    if (AVIF_BRANDS.includes(brand)) {
      return 'avif';
    }
  }

  return null;
}
