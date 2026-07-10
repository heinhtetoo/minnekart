import { db } from '@/db';
import { formatTripDates } from '@/components/home/format';
import { OG_SIZE, renderOgCard, tripCard } from '@/lib/og/card';
import { firstPhotoDataUri } from '@/lib/og/photo';
import { getTripByShareToken } from '@/lib/trips/sharing';

export const alt = 'A travel memory on Minnekart';
export const size = OG_SIZE;
export const contentType = 'image/png';

interface ImageProps {
  params: Promise<{ token: string }>;
}

export default async function Image({ params }: ImageProps) {
  const { token } = await params;
  const trip = await getTripByShareToken(db(), token);
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
