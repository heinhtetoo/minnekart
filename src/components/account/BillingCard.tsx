'use client';

import {
  CheckoutEventNames,
  initializePaddle,
  Paddle,
} from '@paddle/paddle-js';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import styles from './BillingCard.module.css';

export interface PaddleCheckoutConfig {
  environment: 'sandbox' | 'production';
  clientToken: string;
  priceAnnual?: string;
  priceMonthly?: string;
  priceLifetime?: string;
}

// Present only when the user has a Paddle subscription we can act on. Lifetime
// buyers and the grandfathered invite cohort are paid without one, so they get
// no management controls. Dates are pre-formatted server-side to keep locale
// differences out of hydration.
export interface SubscriptionView {
  renewsOn: string | null;
  endsOn: string | null;
}

interface BillingCardProps {
  plan: 'free' | 'paid';
  subscriptionStatus: string | null;
  userId: string;
  email: string;
  paddle: PaddleCheckoutConfig | null;
  subscription: SubscriptionView | null;
}

type Pending = 'cancel' | 'resume' | 'card' | null;

const REFRESH_DELAY_MS = 2500;

export default function BillingCard({
  plan,
  subscriptionStatus,
  userId,
  email,
  paddle,
  subscription,
}: BillingCardProps) {
  const router = useRouter();
  const paddleRef = useRef<Paddle | null>(null);
  const [paymentReceived, setPaymentReceived] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [pending, setPending] = useState<Pending>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!paddle) {
      return;
    }
    let cancelled = false;
    initializePaddle({
      environment: paddle.environment,
      token: paddle.clientToken,
      eventCallback: (event) => {
        if (event.name !== CheckoutEventNames.CHECKOUT_COMPLETED) {
          return;
        }
        setPaymentReceived(true);
        window.setTimeout(() => router.refresh(), REFRESH_DELAY_MS);
      },
    })
      .then((instance) => {
        if (!cancelled && instance) {
          paddleRef.current = instance;
        }
      })
      .catch(() => setError('Could not load the checkout.'));
    return () => {
      cancelled = true;
    };
  }, [paddle, router]);

  function openCheckout(priceId: string) {
    const instance = paddleRef.current;
    if (!instance) {
      setError('The checkout is still loading — try again in a moment.');
      return;
    }
    setError(null);
    instance.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customer: { email },
      customData: { userId },
    });
  }

  async function post(path: string): Promise<Record<string, unknown> | null> {
    const response = await fetch(`/api/account/subscription/${path}`, {
      method: 'POST',
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as Record<string, unknown>;
  }

  async function cancelSubscription() {
    setPending('cancel');
    setError(null);
    const result = await post('cancel');
    setPending(null);
    if (!result) {
      setError('Could not cancel the subscription — please try again.');
      return;
    }
    setConfirmingCancel(false);
    setNotice('Your subscription is scheduled to end.');
    window.setTimeout(() => router.refresh(), REFRESH_DELAY_MS);
  }

  async function resumeSubscription() {
    setPending('resume');
    setError(null);
    const result = await post('resume');
    setPending(null);
    if (!result) {
      setError('Could not resume the subscription — please try again.');
      return;
    }
    setNotice('Your subscription will keep running.');
    window.setTimeout(() => router.refresh(), REFRESH_DELAY_MS);
  }

  async function updateCard() {
    const instance = paddleRef.current;
    if (!instance) {
      setError('The checkout is still loading — try again in a moment.');
      return;
    }
    setPending('card');
    setError(null);
    const result = await post('payment-method');
    setPending(null);
    if (typeof result?.transactionId !== 'string') {
      setError('Could not open the card form — please try again.');
      return;
    }
    instance.Checkout.open({ transactionId: result.transactionId });
  }

  const showUpgrade = plan === 'free' && paddle !== null && !paymentReceived;
  const cancelling = subscription?.endsOn != null;
  const paidUntil = subscription?.renewsOn
    ? `until ${subscription.renewsOn}`
    : "until the end of the period you've paid for";
  const cancelPrompt =
    `Cancel your subscription? You keep the paid plan ${paidUntil}, ` +
    "then go back to the free limits. Nothing you've saved is deleted.";

  return (
    <section className={styles.card}>
      <div className={styles.row}>
        <div>
          <h2 className={styles.rowTitle}>Plan</h2>
          <p className={styles.rowHint}>
            {plan === 'paid'
              ? 'Paid — unlimited memories and photos.'
              : 'Free — 15 memories, 6 photos each.'}
          </p>
        </div>
        <span className={styles.planBadge}>
          {plan === 'paid' ? 'Paid' : 'Free'}
        </span>
      </div>

      {subscriptionStatus === 'past_due' && (
        <p className={styles.warning}>
          There&apos;s a payment issue with your subscription. Update your card
          to keep your plan.
        </p>
      )}

      {paymentReceived && (
        <p className={styles.success}>
          Payment received — your plan updates in a moment.
        </p>
      )}

      {showUpgrade && (
        <div className={styles.upgradeRow}>
          {paddle.priceAnnual && (
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => openCheckout(paddle.priceAnnual as string)}
            >
              Upgrade — $39/year
            </button>
          )}
          {paddle.priceMonthly && (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => openCheckout(paddle.priceMonthly as string)}
            >
              or $5/month
            </button>
          )}
          {paddle.priceLifetime && (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => openCheckout(paddle.priceLifetime as string)}
            >
              Founding member — $99 once
            </button>
          )}
        </div>
      )}

      {subscription && cancelling && (
        <div className={styles.manage}>
          <p className={styles.rowHint}>
            Your subscription ends on {subscription.endsOn}. Until then nothing
            changes, and nothing you&apos;ve saved is ever deleted — after that
            you go back to the free limits.
          </p>
          <div className={styles.upgradeRow}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={resumeSubscription}
              disabled={pending === 'resume'}
            >
              {pending === 'resume' ? 'Resuming…' : 'Resume subscription'}
            </button>
          </div>
        </div>
      )}

      {subscription && !cancelling && !confirmingCancel && (
        <div className={styles.manage}>
          {subscription.renewsOn && (
            <p className={styles.rowHint}>Renews on {subscription.renewsOn}.</p>
          )}
          <div className={styles.upgradeRow}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={updateCard}
              disabled={pending === 'card'}
            >
              {pending === 'card' ? 'Opening…' : 'Update card'}
            </button>
            <button
              type="button"
              className={styles.linkButton}
              onClick={() => setConfirmingCancel(true)}
            >
              Cancel subscription
            </button>
          </div>
        </div>
      )}

      {subscription && !cancelling && confirmingCancel && (
        <div className={styles.manage}>
          <p className={styles.rowHint}>{cancelPrompt}</p>
          <div className={styles.upgradeRow}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => setConfirmingCancel(false)}
            >
              Keep my subscription
            </button>
            <button
              type="button"
              className={styles.dangerButton}
              onClick={cancelSubscription}
              disabled={pending === 'cancel'}
            >
              {pending === 'cancel' ? 'Cancelling…' : 'Yes, cancel'}
            </button>
          </div>
        </div>
      )}

      {notice && <p className={styles.success}>{notice}</p>}
      {error && <p className={styles.error}>{error}</p>}
    </section>
  );
}
