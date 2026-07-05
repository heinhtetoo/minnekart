import Link from 'next/link';

import AppPage from '@/components/layout/AppPage';
import TripForm from '@/components/trips/TripForm';
import { requireVerifiedPageUser } from '@/lib/auth/session-server';

export default async function NewTripPage() {
  const user = await requireVerifiedPageUser();

  return (
    <AppPage user={{ name: user.name, email: user.email }} width="narrow">
      <Link
        href="/"
        style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}
      >
        ← Back to globe
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
        Add a memory
      </h1>
      <TripForm mode="create" />
    </AppPage>
  );
}
