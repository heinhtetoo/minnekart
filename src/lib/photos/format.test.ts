import { describe, expect, it } from 'vitest';

import { sniffImageFormat } from './format';

import { geotaggedJpeg } from '../../../test/exif-fixture';

function bytes(...values: number[]): ArrayBuffer {
  return new Uint8Array(values).buffer;
}

function ascii(text: string, padTo = 0): number[] {
  const codes = [...text].map((character) => character.charCodeAt(0));
  while (codes.length < padTo) {
    codes.push(0);
  }
  return codes;
}

describe('sniffImageFormat', () => {
  it('identifies a JPEG by its start-of-image marker', () => {
    expect(sniffImageFormat(bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0))).toBe(
      'jpeg',
    );
  });

  it('identifies a PNG by its eight-byte signature', () => {
    expect(
      sniffImageFormat(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)),
    ).toBe('png');
  });

  it('identifies a GIF', () => {
    expect(sniffImageFormat(bytes(...ascii('GIF89a', 12)))).toBe('gif');
  });

  it('identifies a WebP by both its RIFF and WEBP markers', () => {
    const buffer = bytes(...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WEBP'));

    expect(sniffImageFormat(buffer)).toBe('webp');
  });

  it('identifies HEIC by its ftyp brand', () => {
    const buffer = bytes(0, 0, 0, 0x18, ...ascii('ftyp'), ...ascii('heic'));

    expect(sniffImageFormat(buffer)).toBe('heic');
  });

  it('identifies the other HEIF brands as HEIC', () => {
    for (const brand of ['heix', 'mif1', 'msf1']) {
      const buffer = bytes(0, 0, 0, 0x18, ...ascii('ftyp'), ...ascii(brand));

      expect(sniffImageFormat(buffer)).toBe('heic');
    }
  });

  it('identifies AVIF by its ftyp brand', () => {
    const buffer = bytes(0, 0, 0, 0x18, ...ascii('ftyp'), ...ascii('avif'));

    expect(sniffImageFormat(buffer)).toBe('avif');
  });

  it('rejects a RIFF container that is not WebP', () => {
    const buffer = bytes(...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WAVE'));

    expect(sniffImageFormat(buffer)).toBeNull();
  });

  it('rejects an ftyp container that is not an image', () => {
    const buffer = bytes(0, 0, 0, 0x18, ...ascii('ftyp'), ...ascii('mp42'));

    expect(sniffImageFormat(buffer)).toBeNull();
  });

  it('rejects a PDF', () => {
    expect(sniffImageFormat(bytes(...ascii('%PDF-1.7', 12)))).toBeNull();
  });

  it('rejects a plain text file', () => {
    expect(sniffImageFormat(bytes(...ascii('hello world', 12)))).toBeNull();
  });

  it('rejects a buffer too short to identify', () => {
    expect(sniffImageFormat(bytes(0xff, 0xd8))).toBeNull();
  });

  it('rejects an empty buffer', () => {
    expect(sniffImageFormat(new ArrayBuffer(0))).toBeNull();
  });

  it('identifies the geotagged fixture the EXIF tests use', async () => {
    const buffer = await geotaggedJpeg().arrayBuffer();

    expect(sniffImageFormat(buffer)).toBe('jpeg');
  });
});
