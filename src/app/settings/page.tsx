import AppPage from '@/components/layout/AppPage';
import BillingCard, {
  PaddleCheckoutConfig,
} from '@/components/account/BillingCard';
import GlobeVisibility from '@/components/account/GlobeVisibility';
import { requireVerifiedPageUser } from '@/lib/auth/session-server';
import { env } from '@/lib/env';

function paddleCheckoutConfig(): PaddleCheckoutConfig | null {
  const {
    PADDLE_ENV,
    PADDLE_CLIENT_TOKEN,
    PADDLE_PRICE_ANNUAL,
    PADDLE_PRICE_MONTHLY,
    PADDLE_PRICE_LIFETIME,
  } = env();
  if (!PADDLE_CLIENT_TOKEN || !PADDLE_PRICE_ANNUAL) {
    return null;
  }
  return {
    environment: PADDLE_ENV,
    clientToken: PADDLE_CLIENT_TOKEN,
    priceAnnual: PADDLE_PRICE_ANNUAL,
    priceMonthly: PADDLE_PRICE_MONTHLY,
    priceLifetime: PADDLE_PRICE_LIFETIME,
  };
}

export default async function SettingsPage() {
  const user = await requireVerifiedPageUser();

  return (
    <AppPage
      user={{
        name: user.name,
        email: user.email,
        isOwner: user.role === 'owner',
      }}
      width="narrow"
    >
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
      <BillingCard
        plan={user.plan}
        subscriptionStatus={user.subscriptionStatus}
        userId={user.id}
        email={user.email}
        paddle={paddleCheckoutConfig()}
      />
    </AppPage>
  );
}
