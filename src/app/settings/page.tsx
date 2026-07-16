import AppPage from '@/components/layout/AppPage';
import BillingCard, {
  PaddleCheckoutConfig,
  SubscriptionView,
} from '@/components/account/BillingCard';
import DeleteAccountCard from '@/components/account/DeleteAccountCard';
import GlobeVisibility from '@/components/account/GlobeVisibility';
import ProfileCard from '@/components/account/ProfileCard';
import { SessionUser } from '@/lib/auth/session';
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

function formatDate(value: Date | null): string | null {
  return value
    ? value.toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;
}

// Managing a plan needs both a Paddle subscription and an API key to act on it.
// Lifetime buyers and the grandfathered cohort are paid without a subscription,
// so they get no controls.
function subscriptionView(user: SessionUser): SubscriptionView | null {
  if (!user.paddleSubscriptionId || !env().PADDLE_API_KEY) {
    return null;
  }
  return {
    renewsOn: formatDate(user.subscriptionRenewsAt),
    endsOn: formatDate(user.subscriptionEndsAt),
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
      <ProfileCard
        initialName={user.name}
        initialTagline={user.tagline ?? ''}
        initialHeadline={user.headline ?? ''}
        initialBio={user.bio ?? ''}
      />
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
        subscription={subscriptionView(user)}
      />
      {user.role !== 'owner' && <DeleteAccountCard username={user.username} />}
    </AppPage>
  );
}
