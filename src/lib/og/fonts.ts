import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface OgFont {
  name: string;
  data: Buffer;
  weight: 400 | 500 | 600;
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
    load('eb-garamond-600.ttf'),
  ]).then(([sansRegular, sansMedium, serifSemiBold]) => [
    { name: 'DM Sans', data: sansRegular, weight: 400, style: 'normal' },
    { name: 'DM Sans', data: sansMedium, weight: 500, style: 'normal' },
    {
      name: 'EB Garamond',
      data: serifSemiBold,
      weight: 600,
      style: 'normal',
    },
  ]);
  return cached;
}
