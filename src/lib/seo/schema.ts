import { PricingTier } from '@/lib/billing/pricing';

import { Guide, guidePath } from './guides';

// JSON-LD builders. Pure functions returning plain objects, so they test under
// the repo's node-only vitest setup the way src/lib/globe/spin.ts does.
//
// The brand name is used throughout rather than `legalEntity()`: that reads
// LEGAL_ENTITY_NAME and falls back to an "HHO" placeholder, so wiring it here
// would publish a placeholder into structured data anywhere the env var is
// unset. The legal identity belongs on the policy pages, not in schema.

const BRAND = 'Minnekart';
const TAGLINE = 'Your journeys, mapped.';
const SCHEMA_CONTEXT = 'https://schema.org';

export type JsonLdValue = Record<string, unknown>;

function absolute(base: string, path: string): string {
  return `${base.replace(/\/$/, '')}${path}`;
}

// Wraps entities into a single JSON-LD *document*. The builders below return
// bare entities — `@context` belongs to the document, not to each node in it.
//
// Multiple entities go under `@graph` rather than as a top-level array. A bare
// array is valid JSON-LD but badly supported: a consumer reading
// `parsed['@context']` gets undefined on an array and throws, which is exactly
// what happened when this first shipped.
export function jsonLdDocument(
  entities: JsonLdValue | JsonLdValue[],
): JsonLdValue {
  const list = Array.isArray(entities) ? entities : [entities];
  if (list.length === 1) {
    return { '@context': SCHEMA_CONTEXT, ...list[0] };
  }
  return { '@context': SCHEMA_CONTEXT, '@graph': list };
}

export function organizationSchema(base: string): JsonLdValue {
  return {
    '@type': 'Organization',
    name: BRAND,
    url: absolute(base, '/'),
    description: TAGLINE,
  };
}

export function webSiteSchema(base: string): JsonLdValue {
  return {
    '@type': 'WebSite',
    name: BRAND,
    url: absolute(base, '/'),
    description: TAGLINE,
  };
}

// `offers` is generated from the same pricingTiers() the page renders, so the
// two cannot drift. A free tier is still an Offer with price 0 — omitting it
// would misrepresent the product as paid-only.
export function softwareApplicationSchema(
  base: string,
  tiers: PricingTier[],
): JsonLdValue {
  return {
    '@type': 'SoftwareApplication',
    name: BRAND,
    url: absolute(base, '/'),
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'Web',
    description:
      'A private travel globe. Pin every place you have been, keep the ' +
      'story and photographs beside it, and share only what you choose.',
    offers: tiers.map((tier) => ({
      '@type': 'Offer',
      name: tier.name,
      price: tier.amount,
      priceCurrency: tier.currency,
      url: absolute(base, '/pricing'),
    })),
  };
}

export function articleSchema(base: string, guide: Guide): JsonLdValue {
  const url = absolute(base, guidePath(guide));
  return {
    '@type': 'Article',
    headline: guide.headline,
    description: guide.description,
    url,
    mainEntityOfPage: url,
    datePublished: guide.datePublished,
    dateModified: guide.dateModified,
    author: { '@type': 'Organization', name: BRAND },
    publisher: { '@type': 'Organization', name: BRAND },
  };
}

export interface Crumb {
  name: string;
  path: string;
}

export function breadcrumbListSchema(
  base: string,
  trail: Crumb[],
): JsonLdValue {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: absolute(base, crumb.path),
    })),
  };
}
