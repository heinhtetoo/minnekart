import { asc, eq } from 'drizzle-orm';
import sharp from 'sharp';

import { db } from '@/db';
import { photos } from '@/db/schema';
import { storage } from '@/lib/storage';

const FETCH_EXPIRY_SECONDS = 300;
// 2x the card's 440px photo frame, so the embed stays crisp but small.
const EMBED_WIDTH = 880;
const EMBED_QUALITY = 80;

// Best-effort: any failure (no photos, storage down, dev's memory://
// sentinel URLs) yields null so the card falls back to a gradient.
// Stored photos are WebP/JPEG (and some legacy mislabelled PNG), but
// satori only embeds PNG/JPEG/GIF data URIs — sharp sniffs the real
// format and re-encodes to a downscaled JPEG.
export async function firstPhotoDataUri(
  tripId: string,
): Promise<string | null> {
  try {
    const [photo] = await db()
      .select()
      .from(photos)
      .where(eq(photos.tripId, tripId))
      .orderBy(asc(photos.position))
      .limit(1);
    if (!photo) {
      return null;
    }
    const url = await storage().presignGet(
      photo.displayKey,
      FETCH_EXPIRY_SECONDS,
    );
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    const source = Buffer.from(await response.arrayBuffer());
    const jpeg = await sharp(source)
      .resize({ width: EMBED_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: EMBED_QUALITY })
      .toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString('base64')}`;
  } catch {
    return null;
  }
}
