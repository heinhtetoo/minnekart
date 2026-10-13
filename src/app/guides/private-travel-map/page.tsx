import type { Metadata } from 'next';
import Link from 'next/link';

import ContentPage from '@/components/layout/ContentPage';
import JsonLd from '@/components/seo/JsonLd';
import { getServerSessionUser } from '@/lib/auth/session-server';
import { env } from '@/lib/env';
import { guideBySlug, guidePath } from '@/lib/seo/guides';
import { articleSchema, breadcrumbListSchema } from '@/lib/seo/schema';

export const dynamic = 'force-dynamic';

const guide = guideBySlug('private-travel-map');

export const metadata: Metadata = {
  title: 'How to keep a private travel record · Minnekart',
  description: guide.description,
  alternates: { canonical: guidePath(guide) },
  openGraph: {
    title: guide.headline,
    description: guide.description,
    type: 'article',
    publishedTime: guide.datePublished,
    modifiedTime: guide.dateModified,
  },
};

export default async function PrivateTravelMapGuide() {
  const viewer = await getServerSessionUser();

  return (
    <ContentPage
      viewer={viewer}
      eyebrow="Guide"
      title="How to keep a private record of everywhere you've travelled"
    >
      <JsonLd
        data={[
          articleSchema(env().APP_URL, guide),
          breadcrumbListSchema(env().APP_URL, [
            { name: 'Guides', path: '/guides' },
            { name: guide.headline, path: guidePath(guide) },
          ]),
        ]}
      />
      <p>
        Most of us carry a map in our heads: the street where you got lost, the
        town you swore you&apos;d return to, the view that made the whole trip
        worth it. What we rarely have is that map written down somewhere
        that&apos;s actually ours — quiet, complete, and not performing for
        anyone. This is a short guide to keeping one.
      </p>

      <h2>Why private, and not a public feed</h2>
      <p>
        The popular travel apps are built around broadcasting: a live route, a
        public profile, a follower count. That&apos;s fine for some, but it
        turns remembering into publishing. A private travel record does the
        opposite — it&apos;s a place to think, not to perform. You add places
        for your own sake, at your own pace, and nobody is watching the dot
        move.
      </p>
      <p>
        Keeping it private also sidesteps a real safety issue: a public,
        real-time trail tells strangers where you are and, by omission, that
        you&apos;re not home. A record you fill in afterwards has none of that
        exposure.
      </p>

      <h2>What a good private map needs</h2>
      <ul>
        <li>
          <strong>One pin per place</strong>, with the story and dates attached
          — so the memory has somewhere to live, not just a coordinate.
        </li>
        <li>
          <strong>Your photos beside the place</strong>, not scattered across a
          camera roll you&apos;ll never scroll back through.
        </li>
        <li>
          <strong>Private by default</strong>, with sharing you turn on
          deliberately — never the other way around.
        </li>
        <li>
          <strong>No live location</strong>. A record of where you&apos;ve been
          should never need to know where you are.
        </li>
      </ul>

      <h2>How Minnekart does it</h2>
      <p>
        Minnekart is a globe you fill in after the fact. You drop a pin for each
        place, add a few words and the dates, and attach the photographs that
        belong there. Everything is <strong>private by default</strong>. Two
        things can change that, and both stay off until you turn them on: a
        share link for a single memory, revocable whenever you like, or a public
        globe — which takes two switches, one to make the globe public and one
        to mark a memory as shown on it.
      </p>
      <p>
        Photos are processed <strong>in your browser before they upload</strong>
        , which strips the embedded EXIF data — including the GPS coordinates
        cameras quietly write into every shot. The date and any coordinates are
        read first, to suggest when and where a memory belongs, and kept only if
        you accept the suggestion. There are no ad trackers and no analytics
        anywhere in the app, and Minnekart never builds a live-location feature.
        You can read the specifics on the{' '}
        <Link href="/privacy">privacy page</Link>.
      </p>

      <h2>Start small</h2>
      <p>
        You don&apos;t need to backfill a decade in one sitting. Add the last
        trip, then the one that mattered most, and let the globe fill in from
        there. It&apos;s <Link href="/pricing">free to start</Link>, and if
        you&apos;re weighing it against a live-tracking app, the{' '}
        <Link href="/guides/polarsteps-alternative">Polarsteps comparison</Link>{' '}
        lays out the difference.
      </p>
      <p>
        <Link href="/">Begin your private map →</Link>
      </p>
    </ContentPage>
  );
}
