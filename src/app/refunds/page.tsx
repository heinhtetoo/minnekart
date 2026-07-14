import type { Metadata } from 'next';
import Link from 'next/link';

import ContentPage from '@/components/layout/ContentPage';
import { getServerSessionUser } from '@/lib/auth/session-server';
import { entityLine, legalEntity, supportEmail } from '@/lib/legal';

export const dynamic = 'force-dynamic';

const DESCRIPTION =
  'Fourteen days to change your mind, on any plan. How to ask for a refund ' +
  'and what happens when you cancel.';

export const metadata: Metadata = {
  title: 'Refunds · Minnekart',
  description: DESCRIPTION,
  openGraph: {
    title: 'Refunds · Minnekart',
    description: DESCRIPTION,
    type: 'website',
  },
};

export default async function RefundsPage() {
  const viewer = await getServerSessionUser();
  const entity = legalEntity();
  const support = supportEmail();

  return (
    <ContentPage
      viewer={viewer}
      eyebrow="Legal"
      title="Refunds"
      updated="13 July 2026"
    >
      <p>
        Minnekart is a service of {entity.name} ({entity.abn}), based in{' '}
        {entity.country}. The short version: if you paid and you&apos;re not
        happy, tell us within 14 days and you get your money back. No reasons
        required.
      </p>

      <h2>The 14-day window</h2>
      <p>
        Every plan — annual, monthly, and the one-off founding member purchase —
        comes with a full refund if you ask within 14 days of the payment. You
        don&apos;t need to explain yourself, and we won&apos;t try to talk you
        out of it.
      </p>

      <h2>How to ask</h2>
      <p>
        Payments are handled by Paddle.com, which is the merchant of record and
        the legal seller of your subscription. So there are two ways to ask for
        a refund, and both work:
      </p>
      <ul>
        <li>Reply to the Paddle receipt email you got when you paid, or</li>
        <li>
          email us at <a href={`mailto:${support}`}>{support}</a> and we will
          organise it with Paddle.
        </li>
      </ul>
      <p>
        Refunds go back to the card or account you paid with. Paddle usually
        processes them within a few days, and your bank typically takes another
        five to ten business days to show it.
      </p>

      <h2>After the 14 days</h2>
      <p>
        You can cancel whenever you like, and you&apos;ll keep your paid plan
        until the end of the period you&apos;ve already paid for. We don&apos;t
        give pro-rata refunds for the unused part of a period after the 14-day
        window has passed. If something has gone genuinely wrong — you were
        double-charged, or charged after cancelling — email us and we&apos;ll
        fix it, whenever it happened.
      </p>

      <h2>What happens to your memories</h2>
      <p>
        A refund or a cancellation moves you back to the free plan. Nothing is
        deleted. Every memory and photo you&apos;ve added stays where it is —
        you simply can&apos;t add new ones beyond the{' '}
        <Link href="/pricing">free limits</Link> until you upgrade again.
      </p>

      <h2>Your consumer rights</h2>
      <p>
        This policy sits on top of the Australian Consumer Law, it doesn&apos;t
        replace it. If the service isn&apos;t fit for purpose or doesn&apos;t
        match how we&apos;ve described it, you have rights to a repair,
        replacement or refund that no policy of ours can take away.
      </p>

      <h2>Contact</h2>
      <p>
        {entityLine(entity)} — <a href={`mailto:${support}`}>{support}</a>.
      </p>
    </ContentPage>
  );
}
