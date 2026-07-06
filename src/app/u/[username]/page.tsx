import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { db } from '@/db';
import Footer from '@/components/layout/Footer';
import PublicChrome from '@/components/public/PublicChrome';
import PublicGlobe from '@/components/public/PublicGlobe';
import { toTripDTO } from '@/lib/trips/dto';
import { getPublicTrips, getPublicUser } from '@/lib/trips/sharing';

interface PublicGlobePageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({
  params,
}: PublicGlobePageProps): Promise<Metadata> {
  const { username } = await params;
  const owner = await getPublicUser(db(), username);
  if (!owner) {
    return { title: 'Globe not found · Minnekart' };
  }
  const title = `${owner.name}'s globe · Minnekart`;
  const description = `Explore ${owner.name}'s public travel memories on Minnekart.`;
  return {
    title,
    description,
    openGraph: { title, description, type: 'profile' },
  };
}

export default async function PublicGlobePage({
  params,
}: PublicGlobePageProps) {
  const { username } = await params;
  const owner = await getPublicUser(db(), username);
  if (!owner) {
    notFound();
  }

  const trips = await getPublicTrips(db(), owner.id);

  return (
    <>
      <PublicChrome ownerName={owner.name} />
      <PublicGlobe
        ownerName={owner.name}
        username={owner.username}
        trips={trips.map(toTripDTO)}
      />
      <Footer loggedIn={false} />
    </>
  );
}
