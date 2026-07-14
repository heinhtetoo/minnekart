import type { Metadata } from 'next';

import ContentPage from '@/components/layout/ContentPage';
import { getServerSessionUser } from '@/lib/auth/session-server';
import { entityLine, legalEntity, SUPPORT_EMAIL } from '@/lib/legal';

export const dynamic = 'force-dynamic';

const DESCRIPTION =
  'What Minnekart collects, what it never collects, and who touches your ' +
  'data. No trackers, no analytics, no live location.';

export const metadata: Metadata = {
  title: 'Privacy · Minnekart',
  description: DESCRIPTION,
  openGraph: {
    title: 'Privacy · Minnekart',
    description: DESCRIPTION,
    type: 'website',
  },
};

export default async function PrivacyPage() {
  const viewer = await getServerSessionUser();
  const entity = legalEntity();

  return (
    <ContentPage
      viewer={viewer}
      eyebrow="Legal"
      title="Privacy"
      updated="13 July 2026"
    >
      <p>
        Minnekart is a service of {entity.name} ({entity.abn}), based in{' '}
        {entity.country}. Privacy isn&apos;t a section we bolted on — it&apos;s
        the reason the product is shaped the way it is. Here is exactly what
        happens to your data.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Your account:</strong> name, username, email address, and your
          password stored only as an Argon2 hash. We never see or store the
          password itself.
        </li>
        <li>
          <strong>What you put in:</strong> the memories you create — place,
          country, coordinates, dates, notes — and the photos you upload.
        </li>
        <li>
          <strong>IP addresses: </strong>used only to rate-limit signups, logins
          and password resets so the service can&apos;t be flooded. They
          aren&apos;t used to profile you.
        </li>
      </ul>

      <h2>What we don&apos;t collect</h2>
      <ul>
        <li>
          <strong>No analytics and no ad trackers.</strong> There is no Google
          Analytics, no pixel, no session recorder. The only third-party code
          that ever loads is Cloudflare Turnstile on the signup form and Paddle
          on the checkout.
        </li>
        <li>
          <strong>No location tracking.</strong> Minnekart never asks for your
          device location, and we have committed to never building live GPS
          tracking. The only coordinates we hold are the places you deliberately
          pin.
        </li>
        <li>
          <strong>No photo metadata. </strong>Your photos are re-encoded in your
          browser before they&apos;re uploaded, which strips the embedded EXIF
          data — including any GPS coordinates your camera recorded. The one
          thing we read from it is the date the photo was taken, so your
          memories can sort themselves.
        </li>
      </ul>

      <h2>Cookies</h2>
      <p>
        One cookie, called <code>session</code>, which keeps you logged in. It
        is HttpOnly, SameSite=Lax, sent only over HTTPS in production, and it
        lasts 30 days. There are no tracking or advertising cookies, so
        there&apos;s nothing to consent to.
      </p>

      <h2>Where your photos live</h2>
      <p>
        Photos are stored in a private Cloudflare R2 bucket that isn&apos;t
        publicly readable. When you or someone with your share link views a
        photo, we mint a signed URL that expires after about an hour. Your globe
        and your memories are private by default — nothing is visible to anyone
        else until you create a share link, and you can revoke a share link at
        any time.
      </p>

      <h2>Who else touches your data</h2>
      <p>
        We keep the list of companies involved as short as we can. Each one does
        one job:
      </p>
      <ul>
        <li>
          <strong>Vercel</strong> — hosts the app.
        </li>
        <li>
          <strong>Neon</strong> — the Postgres database holding your account and
          memories.
        </li>
        <li>
          <strong>Cloudflare</strong> — R2 stores your photos; Turnstile checks
          that signups are human.
        </li>
        <li>
          <strong>Resend</strong> — sends the emails you need (verification
          codes, password resets, invites).
        </li>
        <li>
          <strong>Paddle</strong> — takes payments as merchant of record. Card
          details go to Paddle, never to us; we only ever store a customer ID
          and whether your plan is free or paid.
        </li>
        <li>
          <strong>OpenStreetMap</strong> — when you search for a place, that
          search text is sent to their geocoding service to turn it into
          coordinates. Nothing about your account goes with it.
        </li>
      </ul>
      <p>
        We don&apos;t sell your data, and we don&apos;t hand it to anyone else
        unless the law compels us to.
      </p>

      <h2>Your rights</h2>
      <p>
        You can ask for a copy of your data, ask us to correct it, or ask us to
        delete it. Under the Australian Privacy Principles you can also complain
        to the Office of the Australian Information Commissioner if you think
        we&apos;ve mishandled it.
      </p>

      <h2>Deleting your account</h2>
      <p>
        There is no self-serve delete button yet — that&apos;s an honest gap,
        and it&apos;s on the list. In the meantime, email{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> from your
        account address and we will delete your account, your memories and your
        photos within 30 days, then confirm once it is done. Backups roll over
        within 14 days after that.
      </p>

      <h2>Changes to this page</h2>
      <p>
        If what we do with your data changes, we&apos;ll update this page and
        the date at the top, and email you if the change is significant.
      </p>

      <h2>Contact</h2>
      <p>
        {entityLine(entity)} —{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>
    </ContentPage>
  );
}
