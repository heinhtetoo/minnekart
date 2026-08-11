// Single source of truth for the guide articles' metadata.
//
// The dates live here rather than in the pages because two consumers need
// exactly the same values — `sitemap.ts` for `lastModified` and the `Article`
// schema for `datePublished`/`dateModified`. Two hardcoded copies would drift,
// and a sitemap that disagrees with the structured data is worse than either
// alone.

export type GuideSlug = 'private-travel-map' | 'polarsteps-alternative';

export interface Guide {
  slug: GuideSlug;
  // The H1 and OG title — what an Article's headline should be. The page's
  // `metadata.title` differs deliberately: it carries the " · Minnekart"
  // suffix for the browser tab and SERP.
  headline: string;
  description: string;
  datePublished: string;
  dateModified: string;
}

export const GUIDES: Guide[] = [
  {
    slug: 'private-travel-map',
    headline: 'How to keep a private record of everywhere you have travelled',
    description:
      'A private travel map keeps a record of everywhere you have been — ' +
      'for you, not a public feed. Here is how to build one without live ' +
      'tracking or ads.',
    datePublished: '2026-07-15',
    dateModified: '2026-08-11',
  },
  {
    slug: 'polarsteps-alternative',
    headline: 'A Polarsteps alternative that doesn’t track your live location',
    description:
      'Looking for a Polarsteps alternative that does not track your live ' +
      'location? Minnekart is a private memory globe you fill in after the ' +
      'trip.',
    datePublished: '2026-07-15',
    dateModified: '2026-08-11',
  },
];

// Takes the slug union rather than a bare string, so a typo is a compile
// error instead of an undefined that only surfaces at build time.
export function guideBySlug(slug: GuideSlug): Guide {
  const guide = GUIDES.find((entry) => entry.slug === slug);
  if (!guide) {
    throw new Error(`No guide registered for slug ${slug}`);
  }
  return guide;
}

export function guidePath(guide: Guide): string {
  return `/guides/${guide.slug}`;
}
