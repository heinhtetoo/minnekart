import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface OgFont {
  name: string;
  data: Buffer;
  weight: 400 | 500 | 700;
  style: 'normal';
}

let cached: Promise<OgFont[]> | null = null;

function load(file: string): Promise<Buffer> {
  return readFile(join(process.cwd(), 'src/lib/og/fonts', file));
}

export function ogFonts(): Promise<OgFont[]> {
  cached ??= Promise.all([
    load('dm-sans-400.ttf'),
    load('dm-sans-500.ttf'),
    load('playfair-700.ttf'),
  ]).then(([sansRegular, sansMedium, serifBold]) => [
    { name: 'DM Sans', data: sansRegular, weight: 400, style: 'normal' },
    { name: 'DM Sans', data: sansMedium, weight: 500, style: 'normal' },
    {
      name: 'Playfair Display',
      data: serifBold,
      weight: 700,
      style: 'normal',
    },
  ]);
  return cached;
}
