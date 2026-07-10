import { db } from '@/db';
import { globeCard, OG_SIZE, renderOgCard } from '@/lib/og/card';
import { getPublicTrips, getPublicUser } from '@/lib/trips/sharing';
import { computeStats } from '@/lib/trips/stats';

export const alt = 'A globe of travel memories on Minnekart';
export const size = OG_SIZE;
export const contentType = 'image/png';

interface ImageProps {
  params: Promise<{ username: string }>;
}

export default async function Image({ params }: ImageProps) {
  const { username } = await params;
  const owner = await getPublicUser(db(), username);
  if (!owner) {
    return new Response('Not found', { status: 404 });
  }
  const trips = await getPublicTrips(db(), owner.id);
  const stats = computeStats(trips, 0);
  return renderOgCard(
    globeCard({
      ownerName: owner.name,
      countries: stats.countries,
      places: stats.cities,
      years: stats.years,
    }),
  );
}
