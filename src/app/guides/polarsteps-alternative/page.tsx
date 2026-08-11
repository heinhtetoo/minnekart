import type { Metadata } from 'next';
import Link from 'next/link';

import ContentPage from '@/components/layout/ContentPage';
import ProseTable from '@/components/layout/ProseTable';
import JsonLd from '@/components/seo/JsonLd';
import { getServerSessionUser } from '@/lib/auth/session-server';
import { env } from '@/lib/env';
import { guideBySlug, guidePath } from '@/lib/seo/guides';
import { articleSchema, breadcrumbListSchema } from '@/lib/seo/schema';

export const dynamic = 'force-dynamic';

const guide = guideBySlug('polarsteps-alternative');

export const metadata: Metadata = {
  title: 'A Polarsteps alternative without live tracking · Minnekart',
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

export default async function PolarstepsAlternativeGuide() {
  const viewer = await getServerSessionUser();

  return (
    <ContentPage
      viewer={viewer}
      eyebrow="Guide"
      title="A Polarsteps alternative that doesn't track your live location"
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
        Polarsteps is good at what it does: it follows a journey as it happens,
        plotting your route from your phone&apos;s location and sharing it with
        the people following you. If that&apos;s the point for you, it&apos;s a
        fine choice — and it has real privacy controls, so this isn&apos;t a
        story about one app being careless. But some people want a different
        shape entirely: a record of the places they&apos;ve been, kept for
        themselves, with no audience involved at all. If that&apos;s you,
        here&apos;s how Minnekart compares.
      </p>

      <h2>The core difference: an audience, or none</h2>
      <p>
        Polarsteps is built around <strong>people watching</strong>. Followers
        are the organising idea: a trip is shared with your followers by
        default, your live location shows as a dot on the map while you travel,
        and the app is at its best when someone at home is following along. You
        can lock a trip down to yourself, and you can hide the live dot — but
        those are settings you adjust on a product designed for an audience.
      </p>
      <p>
        Minnekart has <strong>no audience mechanism at all</strong>. There are
        no followers, no feed, nothing to accept or decline, and no live
        location to hide because it never asks for one. It&apos;s a globe you
        fill in afterwards, one pin per place — a record of where you&apos;ve
        been, not a broadcast of where you are. That&apos;s not a stricter
        version of the same idea; it&apos;s a different one.
      </p>

      <h2>Side by side</h2>
      <ProseTable note="Polarsteps details checked against their own support documentation on 11 August 2026. Their product changes; if you are deciding between the two, it is worth confirming the current behaviour with them.">
        <table>
          <thead>
            <tr>
              <th scope="col"></th>
              <th scope="col">Polarsteps</th>
              <th scope="col">Minnekart</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Default visibility</th>
              <td>Your followers</td>
              <td>Private to you</td>
            </tr>
            <tr>
              <th scope="row">Followers and feed</th>
              <td>Yes — following is the organising idea</td>
              <td>None. There is no social graph</td>
            </tr>
            <tr>
              <th scope="row">Live location</th>
              <td>
                Tracked during a trip and shown to followers by default; can be
                hidden
              </td>
              <td>Never asked for, and never will be</td>
            </tr>
            <tr>
              <th scope="row">Visibility options</th>
              <td>Only me, followers, or public</td>
              <td>
                A revocable link per memory, or an opt-in public globe you mark
                memories into
              </td>
            </tr>
            <tr>
              <th scope="row">What it is for</th>
              <td>Following a journey while it happens</td>
              <td>Remembering places afterwards</td>
            </tr>
          </tbody>
        </table>
      </ProseTable>

      <h2>What you get with Minnekart</h2>
      <ul>
        <li>
          <strong>A globe of your places</strong> you can spin, with the story,
          dates, and photos attached to each pin.
        </li>
        <li>
          <strong>Private by default.</strong> Two ways to change that, both off
          until you turn them on: a revocable share link for one memory, or a
          public globe — which needs both the globe switched on in Settings and
          that memory marked to appear on it.
        </li>
        <li>
          <strong>Your photos, cleaned up.</strong> Images are processed in your
          browser before upload, which strips the EXIF data — including the GPS
          location cameras write into each photo. The date and, if present,
          those coordinates are read first to suggest when and where the memory
          belongs; the suggestion is only kept if you accept it.
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
        route from your phone, and has no followers to give you. That&apos;s not
        a missing feature — it&apos;s the whole idea. If you want people
        following your journey as it happens, Polarsteps does that well and this
        doesn&apos;t do it at all. If you want a quiet, private atlas of your
        life&apos;s travels, that&apos;s what this is.
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
