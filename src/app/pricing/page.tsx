import type { Metadata } from 'next';
import Link from 'next/link';

import ContentPage from '@/components/layout/ContentPage';
import JsonLd from '@/components/seo/JsonLd';
import { getServerSessionUser } from '@/lib/auth/session-server';
import { isVerified } from '@/lib/auth/current-user';
import { FREE_PHOTOS_PER_TRIP, FREE_TRIP_LIMIT } from '@/lib/billing/limits';
import { pricingCta, pricingTiers } from '@/lib/billing/pricing';
import { env } from '@/lib/env';
import { softwareApplicationSchema } from '@/lib/seo/schema';

import styles from './pricing.module.css';

export const dynamic = 'force-dynamic';

const DESCRIPTION =
  'Start free with 15 memories. $39 a year for unlimited memories and ' +
  'photos, cancel any time.';

export const metadata: Metadata = {
  title: 'Pricing · Minnekart',
  description: DESCRIPTION,
  alternates: { canonical: '/pricing' },
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
      {/* Offers come from the same `tiers` the page renders below, so the
          structured data can't advertise a plan the page doesn't show. */}
      <JsonLd data={softwareApplicationSchema(env().APP_URL, tiers)} />
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

      <section className={styles.faq} aria-labelledby="faq-heading">
        <h2 id="faq-heading" className={`serif ${styles.faqTitle}`}>
          Questions people actually ask
        </h2>

        <div className={styles.faqItem}>
          <h3 className={styles.faqQuestion}>
            What happens when I hit the free limit?
          </h3>
          <p className={styles.faqAnswer}>
            The free plan holds {FREE_TRIP_LIMIT} memories with{' '}
            {FREE_PHOTOS_PER_TRIP} photos each. When you reach either limit,
            nothing you&apos;ve already added changes — you just can&apos;t add
            more until you upgrade. Your globe, timeline and gallery keep
            working exactly as they did.
          </p>
        </div>

        <div className={styles.faqItem}>
          <h3 className={styles.faqQuestion}>
            If I cancel, do I lose my memories?
          </h3>
          <p className={styles.faqAnswer}>
            No. Cancelling moves you back to the free plan at the end of the
            period you&apos;ve paid for, and nothing is deleted — every memory
            and photo stays where it is. You keep viewing all of them; the
            limits only apply to adding something new. The{' '}
            <Link href="/terms" className={styles.noteLink}>
              terms
            </Link>{' '}
            spell this out.
          </p>
        </div>

        <div className={styles.faqItem}>
          <h3 className={styles.faqQuestion}>Can I get a refund?</h3>
          <p className={styles.faqAnswer}>
            Yes — 14 days, any plan, no reason needed, and that includes the
            founding-member payment. After that you can still cancel any time
            and keep the plan until the period ends. Full detail on the{' '}
            <Link href="/refunds" className={styles.noteLink}>
              refunds page
            </Link>
            .
          </p>
        </div>

        <div className={styles.faqItem}>
          <h3 className={styles.faqQuestion}>Is any of this public?</h3>
          <p className={styles.faqAnswer}>
            Not unless you decide it is. Everything is private by default, and
            there are exactly two ways to change that: a revocable share link
            for a single memory, or a public globe — which needs both the globe
            turned on in Settings and that memory marked to appear on it. There
            are no followers and no feed.
          </p>
        </div>

        <div className={styles.faqItem}>
          <h3 className={styles.faqQuestion}>Where do my photos live?</h3>
          <p className={styles.faqAnswer}>
            In a private bucket that isn&apos;t publicly readable. Viewing one
            mints a link that expires after about an hour, so revoking a share
            genuinely revokes access. Photos are re-encoded in your browser
            before upload, which strips the embedded EXIF data — see the{' '}
            <Link href="/privacy" className={styles.noteLink}>
              privacy page
            </Link>{' '}
            for exactly what gets read first and why.
          </p>
        </div>

        <div className={styles.faqItem}>
          <h3 className={styles.faqQuestion}>
            Can I delete my account and everything in it?
          </h3>
          <p className={styles.faqAnswer}>
            Yes, yourself, from Settings → Delete account. It removes the
            account, the memories and the photographs — a real deletion, not a
            deactivation — and cancels any active subscription at the same time.
          </p>
        </div>
      </section>
    </ContentPage>
  );
}
