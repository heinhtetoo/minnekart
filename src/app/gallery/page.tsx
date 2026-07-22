import Link from 'next/link';

import AppPage from '@/components/layout/AppPage';
import GalleryView from '@/components/photos/GalleryView';
import { requireVerifiedPageUser } from '@/lib/auth/session-server';
import { userLibraryPage, userPhotoCountries } from '@/lib/photos/library';

import styles from './gallery.module.css';

interface GalleryPageProps {
  searchParams: Promise<{ country?: string }>;
}

export default async function GalleryPage({ searchParams }: GalleryPageProps) {
  const user = await requireVerifiedPageUser();
  const { country } = await searchParams;

  // An unknown ?country= falls back to All rather than an empty gallery.
  const countries = await userPhotoCountries(user.id);
  const selected = country && countries.includes(country) ? country : null;
  const page = await userLibraryPage(user.id, { country: selected });

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

      {page.photos.length === 0 ? (
        <p className={styles.empty}>
          No photos yet.{' '}
          <Link href="/trip/new" className="authlink">
            Add a memory
          </Link>{' '}
          and upload some.
        </p>
      ) : (
        <GalleryView
          initialPhotos={page.photos}
          initialHasMore={page.hasMore}
          countries={countries}
          initialCountry={selected}
        />
      )}
    </AppPage>
  );
}
