import type { Metadata } from 'next';

import type { PhotoTile } from '@/components/photos/PhotoGrid';

interface MetaTrip {
  placeName: string;
  country: string;
  highlight: string | null;
  story: string | null;
}

export function publicTripMetadata(
  trip: MetaTrip,
  tiles: PhotoTile[],
): Metadata {
  const title = `${trip.placeName} · ${trip.country}`;
  const description = summarise(trip.highlight, trip.story);
  const image = tiles[0]?.displayUrl;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      images: image ? [image] : undefined,
    },
  };
}

function summarise(highlight: string | null, story: string | null): string {
  if (highlight) {
    return highlight;
  }
  if (story) {
    return story.split(/\n/)[0].trim().slice(0, 200);
  }
  return 'A travel memory on Minnekart.';
}
