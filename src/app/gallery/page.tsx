import { desc, eq } from 'drizzle-orm';
import Link from 'next/link';

import { db } from '@/db';
import { photos as photosTable, trips as tripsTable } from '@/db/schema';
import AppPage from '@/components/layout/AppPage';
import GalleryView, { GalleryPhoto } from '@/components/photos/GalleryView';
import { requireVerifiedPageUser } from '@/lib/auth/session-server';
import { toSignedPhotoDTO } from '@/lib/photos/dto';
import { signPhoto } from '@/lib/photos/sign';
import { storage } from '@/lib/storage';

import styles from './gallery.module.css';

interface GalleryPageProps {
  searchParams: Promise<{ country?: string }>;
}

export default async function GalleryPage({ searchParams }: GalleryPageProps) {
  const user = await requireVerifiedPageUser();
  const { country } = await searchParams;

  const rows = await db()
    .select({
      photo: photosTable,
      country: tripsTable.country,
      placeName: tripsTable.placeName,
    })
    .from(photosTable)
    .innerJoin(tripsTable, eq(photosTable.tripId, tripsTable.id))
    .where(eq(photosTable.userId, user.id))
    .orderBy(desc(photosTable.createdAt));

  const store = storage();
  const photos: GalleryPhoto[] = await Promise.all(
    rows.map(async (row) => ({
      ...toSignedPhotoDTO(await signPhoto(store, row.photo)),
      country: row.country,
      placeName: row.placeName,
    })),
  );

  return (
    <AppPage
      user={{
        name: user.name,
        email: user.email,
        isOwner: user.role === 'owner',
      }}
      width="wide"
    >
      <header className={styles.header}>
        <p className={styles.eyebrow}>The Collection</p>
        <h1 className={`serif ${styles.title}`}>Gallery</h1>
      </header>

      {photos.length === 0 ? (
        <p className={styles.empty}>
          No photos yet.{' '}
          <Link href="/trip/new" className="authlink">
            Add a memory
          </Link>{' '}
          and upload some.
        </p>
      ) : (
        <GalleryView photos={photos} initialCountry={country ?? null} />
      )}
    </AppPage>
  );
}
