import AppPage from '@/components/layout/AppPage';
import BackLink from '@/components/trips/BackLink';
import TripForm from '@/components/trips/TripForm';
import { requireVerifiedPageUser } from '@/lib/auth/session-server';

export default async function NewTripPage() {
  const user = await requireVerifiedPageUser();

  return (
    <AppPage
      user={{
        name: user.name,
        email: user.email,
        isOwner: user.role === 'owner',
      }}
    >
      <TripForm
        mode="create"
        title="Add a memory"
        back={<BackLink fallbackHref="/" fallbackLabel="← Back to globe" />}
      />
    </AppPage>
  );
}
