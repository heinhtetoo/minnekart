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

interface BillingCardProps {
  plan: 'free' | 'paid';
  subscriptionStatus: string | null;
  userId: string;
  email: string;
  paddle: PaddleCheckoutConfig | null;
}

const REFRESH_DELAY_MS = 2500;

export default function BillingCard({
  plan,
  subscriptionStatus,
  userId,
  email,
  paddle,
}: BillingCardProps) {
  const router = useRouter();
  const paddleRef = useRef<Paddle | null>(null);
  const [paymentReceived, setPaymentReceived] = useState(false);
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

  const showUpgrade = plan === 'free' && paddle !== null && !paymentReceived;

  return (
    <section className={styles.card}>
      <div className={styles.row}>
        <div>
          <p className={styles.rowTitle}>Plan</p>
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
          There&apos;s a payment issue with your subscription. Check your Paddle
          receipt email to update your card.
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

      {error && <p className={styles.error}>{error}</p>}
    </section>
  );
}
