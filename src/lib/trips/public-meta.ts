import type { Metadata } from 'next';

interface MetaTrip {
  placeName: string;
  country: string;
  highlight: string | null;
  story: string | null;
}

// og:image comes from the opengraph-image.tsx convention in each route,
// so previews use a stable URL instead of the ~1h signed photo URL.
export function publicTripMetadata(trip: MetaTrip): Metadata {
  const title = `${trip.placeName} · ${trip.country}`;
  const description = summarise(trip.highlight, trip.story);
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
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
