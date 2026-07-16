import type { Metadata } from 'next';
import Link from 'next/link';

import ContentPage from '@/components/layout/ContentPage';
import { getServerSessionUser } from '@/lib/auth/session-server';
import { entityLine, legalEntity, supportEmail } from '@/lib/legal';

export const dynamic = 'force-dynamic';

const DESCRIPTION =
  'Minnekart is a private globe of your travel memories — made for after ' +
  'the trip, funded by the people who use it, with no trackers anywhere.';

export const metadata: Metadata = {
  title: 'About · Minnekart',
  description: DESCRIPTION,
  openGraph: {
    title: 'About · Minnekart',
    description: DESCRIPTION,
    type: 'website',
  },
};

export default async function AboutPage() {
  const viewer = await getServerSessionUser();
  const entity = legalEntity();
  const support = supportEmail();

  return (
    <ContentPage viewer={viewer} eyebrow="About" title="About Minnekart">
      <p>
        Minnekart is a private globe of your travel memories. You pin the places
        you&apos;ve been, keep the photographs and the stories, and spin a world
        that slowly fills with your own life. It&apos;s made for after the trip
        — a quiet record you return to, not a feed that broadcasts where you are
        right now.
      </p>

      <h2>Why it exists</h2>
      <p>
        Most travel apps are built around sharing: live location, public
        profiles, engagement. The memories end up shaped for an audience. We
        wanted the opposite — somewhere the record is <strong>for you</strong>,
        private by default, where sharing is a deliberate choice you make one
        memory at a time and can take back at any time.
      </p>

      <h2>The privacy stance</h2>
      <p>
        Privacy isn&apos;t a feature we added — it&apos;s the reason the product
        is shaped the way it is. There are no ad trackers and no analytics
        anywhere. Minnekart never asks for your device location, and we have
        committed to never building live GPS tracking. Photos are re-encoded in
        your browser before upload, which strips the embedded camera metadata.
        The full detail — what we collect, what we never collect, and who
        touches your data — is on the <Link href="/privacy">privacy page</Link>,
        and it&apos;s written as a commitment, not boilerplate.
      </p>

      <h2>How it&apos;s funded</h2>
      <p>
        You pay for Minnekart, so you&apos;re not the product. There&apos;s a
        free tier to start your globe and a paid plan when it grows — see{' '}
        <Link href="/pricing">pricing</Link>. No ads, no selling data, no
        investors pushing for engagement. The incentives stay pointed at one
        thing: keeping your memories safe and yours.
      </p>

      <h2>Start somewhere</h2>
      <p>
        If you&apos;re weighing up how to keep your own travel record, the{' '}
        <Link href="/guides">guides</Link> are a short, practical place to begin
        — or just <Link href="/">start your globe</Link> with the first place
        that comes to mind.
      </p>

      <h2>Contact</h2>
      <p>
        {entityLine(entity)} — <a href={`mailto:${support}`}>{support}</a>.
      </p>
    </ContentPage>
  );
}
