import Footer from '@/components/layout/Footer';
import type { PhotoTile } from '@/components/photos/PhotoGrid';
import TripDetailBody from '@/components/trips/TripDetailBody';

import PublicChrome from './PublicChrome';

interface PublicTripViewProps {
  ownerName: string;
  backHref: string;
  backLabel: string;
  trip: {
    id: string;
    placeName: string;
    country: string;
    dateStart: string;
    dateEnd: string | null;
    highlight: string | null;
    story: string | null;
  };
  tiles: PhotoTile[];
}

export default function PublicTripView({
  ownerName,
  backHref,
  backLabel,
  trip,
  tiles,
}: PublicTripViewProps) {
  return (
    <>
      <PublicChrome ownerName={ownerName} />
      <TripDetailBody
        tripId={trip.id}
        placeName={trip.placeName}
        country={trip.country}
        dateStart={trip.dateStart}
        dateEnd={trip.dateEnd}
        highlight={trip.highlight}
        story={trip.story}
        tiles={tiles}
        backHref={backHref}
        backLabel={backLabel}
      />
      <Footer loggedIn={false} />
    </>
  );
}
