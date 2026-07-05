import Link from 'next/link';
import { notFound } from 'next/navigation';

import { db } from '@/db';
import AppPage from '@/components/layout/AppPage';
import PhotoUploader from '@/components/photos/PhotoUploader';
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
    <AppPage user={{ name: user.name, email: user.email }} width="narrow">
      <Link
        href={`/trip/${id}`}
        style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}
      >
        ← Back to memory
      </Link>
      <h1
        className="serif"
        style={{
          fontSize: 'clamp(28px,5vw,40px)',
          fontWeight: 700,
          color: 'var(--foreground)',
          letterSpacing: '-1px',
          margin: '14px 0 24px',
        }}
      >
        Edit memory
      </h1>
      <TripForm mode="edit" tripId={id} initial={toTripDTO(trip)} />
      <PhotoUploader tripId={id} />
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
