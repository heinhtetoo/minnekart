import type { Metadata } from 'next';
import Link from 'next/link';

import ContentPage from '@/components/layout/ContentPage';
import { getServerSessionUser } from '@/lib/auth/session-server';
import { entityLine, legalEntity, supportEmail } from '@/lib/legal';

export const dynamic = 'force-dynamic';

const DESCRIPTION = 'The terms you agree to when you use Minnekart.';

export const metadata: Metadata = {
  title: 'Terms · Minnekart',
  description: DESCRIPTION,
  openGraph: {
    title: 'Terms · Minnekart',
    description: DESCRIPTION,
    type: 'website',
  },
};

export default async function TermsPage() {
  const viewer = await getServerSessionUser();
  const entity = legalEntity();
  const support = supportEmail();

  return (
    <ContentPage
      viewer={viewer}
      eyebrow="Legal"
      title="Terms of service"
      updated="13 July 2026"
    >
      <p>
        Minnekart is a service of {entity.name} ({entity.abn}), based in{' '}
        {entity.country}. Using Minnekart means you agree to what follows. If
        you don&apos;t agree with it, please don&apos;t use the service.
      </p>

      <h2>What Minnekart is</h2>
      <p>
        Minnekart is a private place to record where you&apos;ve been: you add a
        memory for each place, attach photos, and see them on your own globe,
        timeline and gallery. It is not a live location tracker, and it never
        will be.
      </p>

      <h2>Your account</h2>
      <p>
        You need an account to use Minnekart, and you must give a real email
        address so we can verify it and reach you about your account. Keep your
        password to yourself — you&apos;re responsible for what happens under
        your account. Tell us at <a href={`mailto:${support}`}>{support}</a> if
        you think someone else has got into it.
      </p>
      <p>You must be at least 16 years old to hold an account.</p>

      <h2>Your content stays yours</h2>
      <p>
        Your photos and the words you write remain yours. You give us only the
        permission we need to run the service: to store your content, process it
        (for example, making display and thumbnail sizes), and show it back to
        you — and to anyone you deliberately hand a share link to. We don&apos;t
        sell your content, use it to train anything, or show it to anyone you
        haven&apos;t chosen to share it with.
      </p>
      <p>
        You must have the right to upload what you upload, and it must not break
        the law or anyone else&apos;s rights.
      </p>

      <h2>Fair use</h2>
      <p>
        Please don&apos;t use Minnekart to store illegal material, to abuse or
        harass anyone, to resell the service, or to attack the infrastructure
        (scraping, breaking rate limits, probing for holes). Paid plans are for
        personal use and are described as unlimited in good faith; we reserve
        the right to step in on accounts whose usage is plainly automated or
        abusive rather than a person recording their travels.
      </p>

      <h2>Payments</h2>
      <p>
        Our order process is run by Paddle.com, which is the{' '}
        <strong>merchant of record</strong> for every purchase — Paddle is the
        seller, handles the payment, works out any VAT or GST, and sends your
        receipt. Their terms and privacy notice also apply to the transaction.
      </p>
      <p>
        Prices are shown on the <Link href="/pricing">pricing page</Link>. If we
        change what a plan costs, the new price applies from your next renewal,
        and we&apos;ll tell you first. Refunds are covered by our{' '}
        <Link href="/refunds">refund policy</Link>.
      </p>

      <h2>Cancelling and downgrading</h2>
      <p>
        You can cancel at any time. Your paid plan keeps running until the end
        of the period you&apos;ve paid for, and then your account returns to the
        free plan. Nothing is deleted when that happens: everything you&apos;ve
        already saved stays, you simply can&apos;t add new memories or photos
        beyond the free limits until you upgrade again.
      </p>

      <h2>Suspension and closing accounts</h2>
      <p>
        You can ask us to delete your account at any time by emailing{' '}
        <a href={`mailto:${support}`}>{support}</a>. We may suspend or close an
        account that breaks these terms, is being used illegally, or is putting
        the service at risk. If we do that and you&apos;ve paid for time you
        can&apos;t use, we&apos;ll refund the unused part unless the account was
        closed for serious misuse.
      </p>

      <h2>Availability</h2>
      <p>
        Minnekart is provided as-is. We don&apos;t promise it will be available
        without interruption or free of faults, and we can change or retire
        features. We take backups, but you should keep your own copies of photos
        that matter to you — a single service is not an archive.
      </p>

      <h2>Australian Consumer Law</h2>
      <p>
        Nothing in these terms excludes, restricts or modifies any guarantee,
        right or remedy you have under the Australian Consumer Law or any other
        law that cannot be excluded. Where we&apos;re allowed to limit our
        liability, we limit it to resupplying the service or refunding what you
        paid for it in the previous 12 months.
      </p>

      <h2>Changes to these terms</h2>
      <p>
        We&apos;ll update this page if the terms change, and change the date at
        the top. If a change matters to you — pricing, or what we do with your
        content — we&apos;ll email you rather than quietly editing the page.
      </p>

      <h2>Governing law</h2>
      <p>
        These terms are governed by the laws of Australia, and the Australian
        courts have jurisdiction over any dispute.
      </p>

      <h2>Contact</h2>
      <p>
        {entityLine(entity)} — <a href={`mailto:${support}`}>{support}</a>. We
        answer email.
      </p>
    </ContentPage>
  );
}
