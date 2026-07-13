import type { Metadata } from 'next';
import Link from 'next/link';

import ContentPage from '@/components/layout/ContentPage';
import { getServerSessionUser } from '@/lib/auth/session-server';
import { isVerified } from '@/lib/auth/current-user';
import { pricingCta, pricingTiers } from '@/lib/billing/pricing';
import { env } from '@/lib/env';

import styles from './pricing.module.css';

export const dynamic = 'force-dynamic';

const DESCRIPTION =
  'Start free with 15 memories. $39 a year for unlimited memories and ' +
  'photos, cancel any time.';

export const metadata: Metadata = {
  title: 'Pricing · Minnekart',
  description: DESCRIPTION,
  openGraph: {
    title: 'Pricing · Minnekart',
    description: DESCRIPTION,
    type: 'website',
  },
};

export default async function PricingPage() {
  const viewer = await getServerSessionUser();
  const loggedIn = viewer !== null && isVerified(viewer);
  const tiers = pricingTiers({
    lifetime: Boolean(env().PADDLE_PRICE_LIFETIME),
  });

  return (
    <ContentPage
      viewer={viewer}
      eyebrow="Plans"
      title="Simple pricing for a long memory"
      layout="wide"
    >
      <p className={styles.lead}>
        Minnekart is the private, spatial home for everywhere you&apos;ve been —
        not another app trying to track where you&apos;re going next. Start
        free. Pay only when you&apos;ve outgrown it.
      </p>

      <section className={styles.tiers} aria-label="Plans">
        {tiers.map((tier) => {
          const cta = pricingCta(tier, loggedIn);
          return (
            <article
              key={tier.id}
              className={`${styles.tier}${
                tier.featured ? ` ${styles.tierFeatured}` : ''
              }`}
            >
              {tier.featured && <p className={styles.badge}>Most popular</p>}
              <h2 className={styles.tierName}>{tier.name}</h2>
              <p className={styles.price}>
                <span className={styles.priceValue}>{tier.price}</span>
                <span className={styles.cadence}>{tier.cadence}</span>
              </p>
              <p className={styles.summary}>{tier.summary}</p>
              <ul className={styles.features}>
                {tier.features.map((feature) => (
                  <li key={feature} className={styles.feature}>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href={cta.href}
                className={
                  tier.featured ? styles.primaryCta : styles.secondaryCta
                }
              >
                {cta.label}
              </Link>
            </article>
          );
        })}
      </section>

      <section className={styles.notes}>
        <div className={styles.note}>
          <h2 className={styles.noteTitle}>Taxes and receipts</h2>
          <p className={styles.noteBody}>
            Payments run through Paddle, our merchant of record. Any VAT or GST
            is worked out at checkout, and Paddle emails your receipt.
          </p>
        </div>
        <div className={styles.note}>
          <h2 className={styles.noteTitle}>Cancelling</h2>
          <p className={styles.noteBody}>
            Cancel whenever you like. Your paid plan runs to the end of the
            period you&apos;ve already paid for. There&apos;s also a{' '}
            <Link href="/refunds" className={styles.noteLink}>
              14-day refund
            </Link>{' '}
            if you change your mind.
          </p>
        </div>
        <div className={styles.note}>
          <h2 className={styles.noteTitle}>If you go back to free</h2>
          <p className={styles.noteBody}>
            Nothing is deleted. Every memory and photo you&apos;ve added stays
            exactly where it is — you just can&apos;t add new ones beyond the
            free limits until you upgrade again.
          </p>
        </div>
      </section>
    </ContentPage>
  );
}
