import { db } from '@/db';
import { formatTripDates } from '@/components/home/format';
import { OG_SIZE, renderOgCard, tripCard } from '@/lib/og/card';
import { firstPhotoDataUri } from '@/lib/og/photo';
import { getPublicTrip, getPublicUser } from '@/lib/trips/sharing';

export const alt = 'A travel memory on Minnekart';
export const size = OG_SIZE;
export const contentType = 'image/png';

interface ImageProps {
  params: Promise<{ username: string; tripId: string }>;
}

export default async function Image({ params }: ImageProps) {
  const { username, tripId } = await params;
  const owner = await getPublicUser(db(), username);
  const trip = owner ? await getPublicTrip(db(), owner.id, tripId) : null;
  if (!trip) {
    return new Response('Not found', { status: 404 });
  }
  const photoDataUri = await firstPhotoDataUri(trip.id);
  return renderOgCard(
    tripCard({
      placeName: trip.placeName,
      country: trip.country,
      dates: formatTripDates(trip.dateStart, trip.dateEnd),
      photoDataUri,
      gradientSeed: trip.id,
    }),
  );
}
