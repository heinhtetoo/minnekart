import type { Metadata } from 'next';
import Link from 'next/link';

import ContentPage from '@/components/layout/ContentPage';
import { getServerSessionUser } from '@/lib/auth/session-server';

export const dynamic = 'force-dynamic';

const DESCRIPTION =
  'Guides on keeping a private record of the places you have travelled — ' +
  'without live tracking, ads, or analytics.';

export const metadata: Metadata = {
  title: 'Guides · Minnekart',
  description: DESCRIPTION,
  openGraph: {
    title: 'Guides · Minnekart',
    description: DESCRIPTION,
    type: 'website',
  },
};

export default async function GuidesPage() {
  const viewer = await getServerSessionUser();

  return (
    <ContentPage viewer={viewer} eyebrow="Guides" title="Guides">
      <p>
        Short, practical reads on keeping a private map of everywhere
        you&apos;ve been — the thinking behind Minnekart, and how it differs
        from the apps that want to broadcast where you are right now.
      </p>
      <ul>
        <li>
          <Link href="/guides/private-travel-map">
            How to keep a private record of everywhere you&apos;ve travelled
          </Link>{' '}
          — a quiet, personal map you own, not a public feed.
        </li>
        <li>
          <Link href="/guides/polarsteps-alternative">
            A Polarsteps alternative that doesn&apos;t track your live location
          </Link>{' '}
          — a memory globe for after the trip, not a live tracker.
        </li>
      </ul>
    </ContentPage>
  );
}
