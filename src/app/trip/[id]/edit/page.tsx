import Link from 'next/link';
import { notFound } from 'next/navigation';

import { db } from '@/db';
import AppPage from '@/components/layout/AppPage';
import PhotoUploader from '@/components/photos/PhotoUploader';
import ShareCard from '@/components/trips/ShareCard';
import TripForm from '@/components/trips/TripForm';
import { requireVerifiedPageUser } from '@/lib/auth/session-server';
import { getOwnedTrip } from '@/lib/trips/access';
import { toTripDTO } from '@/lib/trips/dto';

interface EditTripPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTripPage({ params }: EditTripPageProps) {
  const user = await requireVerifiedPageUser();
  const { id } = await params;

  const trip = await loadOwnedTrip(id, user.id);
  if (!trip) {
    notFound();
  }

  return (
    <AppPage
      user={{
        name: user.name,
        email: user.email,
        isOwner: user.role === 'owner',
      }}
    >
      <TripForm
        mode="edit"
        tripId={id}
        initial={toTripDTO(trip)}
        title="Edit memory"
        back={<Link href={`/trip/${id}`}>← Back to memory</Link>}
      >
        <PhotoUploader tripId={id} plan={user.plan} />
        <ShareCard
          tripId={id}
          isPublic={trip.isPublic}
          isFeatured={trip.isFeatured}
          shareToken={trip.shareToken}
        />
      </TripForm>
    </AppPage>
  );
}

async function loadOwnedTrip(id: string, userId: string) {
  try {
    return await getOwnedTrip(db(), id, userId);
  } catch {
    return null;
  }
}
