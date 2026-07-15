import type { Metadata } from 'next';
import Link from 'next/link';

import ContentPage from '@/components/layout/ContentPage';
import { getServerSessionUser } from '@/lib/auth/session-server';

export const dynamic = 'force-dynamic';

const DESCRIPTION =
  'Looking for a Polarsteps alternative that does not track your live ' +
  'location? Minnekart is a private memory globe you fill in after the trip.';

export const metadata: Metadata = {
  title: 'A Polarsteps alternative without live tracking · Minnekart',
  description: DESCRIPTION,
  openGraph: {
    title: 'A Polarsteps alternative that doesn’t track your live location',
    description: DESCRIPTION,
    type: 'website',
  },
};

export default async function PolarstepsAlternativeGuide() {
  const viewer = await getServerSessionUser();

  return (
    <ContentPage
      viewer={viewer}
      eyebrow="Guide"
      title="A Polarsteps alternative that doesn't track your live location"
    >
      <p>
        Polarsteps is good at what it does: it follows a journey as it happens,
        plotting your route from your phone&apos;s location. If that live trail
        is the point for you, it&apos;s a fine choice. But a lot of people want
        the opposite — a private record of the places they&apos;ve been, without
        an app quietly logging where they are. If that&apos;s you, here&apos;s
        how Minnekart compares.
      </p>

      <h2>The core difference</h2>
      <p>
        Polarsteps is oriented around the <strong>live journey</strong>:
        tracking a route, following friends, a public trip profile. Minnekart is
        oriented around <strong>memory</strong>: a globe you fill in afterwards,
        one pin per place, private unless you decide to share a single trip. It
        never needs your live location, because it&apos;s a record of where
        you&apos;ve been — not where you are.
      </p>

      <h2>What you get with Minnekart</h2>
      <ul>
        <li>
          <strong>A globe of your places</strong> you can spin, with the story,
          dates, and photos attached to each pin.
        </li>
        <li>
          <strong>Private by default.</strong> Nothing is public until you turn
          on a share link for a specific trip — and you can revoke it later.
        </li>
        <li>
          <strong>Your photos, cleaned up.</strong> Images are processed in your
          browser before upload, which strips the EXIF data — including the GPS
          location cameras write into each photo.
        </li>
        <li>
          <strong>No trackers, no analytics, no ads.</strong> There is no
          third-party tracking anywhere in the app, and no live-location feature
          is planned — see the <Link href="/privacy">privacy page</Link>.
        </li>
      </ul>

      <h2>What it deliberately doesn&apos;t do</h2>
      <p>
        Minnekart won&apos;t follow you in real time, won&apos;t plot a live
        route from your phone, and won&apos;t give you a public follower feed.
        That&apos;s not a missing feature — it&apos;s the whole idea. If you
        specifically want live tracking and a social trip stream, Polarsteps is
        the better fit. If you want a quiet, private atlas of your life&apos;s
        travels, that&apos;s what this is.
      </p>

      <h2>Trying it</h2>
      <p>
        It&apos;s <Link href="/pricing">free to start</Link>, and the{' '}
        <Link href="/guides/private-travel-map">
          guide to keeping a private travel record
        </Link>{' '}
        walks through how to build one. When you&apos;re ready:
      </p>
      <p>
        <Link href="/">Start your private globe →</Link>
      </p>
    </ContentPage>
  );
}
