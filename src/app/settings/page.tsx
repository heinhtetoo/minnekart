import AppPage from '@/components/layout/AppPage';
import GlobeVisibility from '@/components/account/GlobeVisibility';
import { requireVerifiedPageUser } from '@/lib/auth/session-server';

export default async function SettingsPage() {
  const user = await requireVerifiedPageUser();

  return (
    <AppPage user={{ name: user.name, email: user.email }} width="narrow">
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: 3,
          color: 'var(--accent)',
          textTransform: 'uppercase',
          margin: '0 0 12px',
        }}
      >
        Your account
      </p>
      <h1
        className="serif"
        style={{
          fontSize: 'clamp(28px,5vw,40px)',
          fontWeight: 700,
          color: 'var(--foreground)',
          letterSpacing: '-1px',
          margin: '0 0 24px',
        }}
      >
        Settings
      </h1>
      <GlobeVisibility
        initialPublic={user.globePublic}
        username={user.username}
      />
    </AppPage>
  );
}
