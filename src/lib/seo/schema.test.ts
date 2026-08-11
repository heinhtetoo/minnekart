import { describe, expect, it } from 'vitest';

import { pricingTiers } from '@/lib/billing/pricing';

import { guideBySlug } from './guides';
import {
  articleSchema,
  breadcrumbListSchema,
  jsonLdDocument,
  organizationSchema,
  softwareApplicationSchema,
  webSiteSchema,
} from './schema';

const BASE = 'https://minnekart.com';

describe('organizationSchema / webSiteSchema', () => {
  it('identifies the brand, not the env-configured legal entity', () => {
    // legalEntity() falls back to an "HHO" placeholder when the env var is
    // unset, which must never reach structured data.
    expect(organizationSchema(BASE).name).toBe('Minnekart');
    expect(webSiteSchema(BASE).name).toBe('Minnekart');
  });

  it('builds an absolute url', () => {
    expect(organizationSchema(BASE).url).toBe('https://minnekart.com/');
  });

  it('does not double the slash when the base has a trailing one', () => {
    expect(webSiteSchema('https://minnekart.com/').url).toBe(
      'https://minnekart.com/',
    );
  });
});

describe('jsonLdDocument', () => {
  // The regression this pins: emitting a bare top-level array meant a consumer
  // reading `parsed['@context']` got undefined and threw
  // ("undefined is not an object"). A document always has @context at the top.
  it('never emits a bare array, however many entities it is given', () => {
    const doc = jsonLdDocument([organizationSchema(BASE), webSiteSchema(BASE)]);
    expect(Array.isArray(doc)).toBe(false);
    expect(doc['@context']).toBe('https://schema.org');
  });

  it('puts multiple entities under @graph', () => {
    const doc = jsonLdDocument([organizationSchema(BASE), webSiteSchema(BASE)]);
    const graph = doc['@graph'] as Record<string, unknown>[];
    expect(graph).toHaveLength(2);
    expect(graph.map((node) => node['@type'])).toEqual([
      'Organization',
      'WebSite',
    ]);
  });

  it('inlines a lone entity rather than wrapping it in @graph', () => {
    const doc = jsonLdDocument(organizationSchema(BASE));
    expect(doc['@graph']).toBeUndefined();
    expect(doc['@type']).toBe('Organization');
    expect(doc['@context']).toBe('https://schema.org');
  });

  it('treats a single-element array as a lone entity', () => {
    const doc = jsonLdDocument([organizationSchema(BASE)]);
    expect(doc['@graph']).toBeUndefined();
    expect(doc['@type']).toBe('Organization');
  });

  it('leaves @context off the individual entities', () => {
    // Repeating it per node is redundant and was what tempted the bare array
    // in the first place.
    const graph = jsonLdDocument([
      organizationSchema(BASE),
      webSiteSchema(BASE),
    ])['@graph'] as Record<string, unknown>[];
    for (const node of graph) {
      expect(node['@context']).toBeUndefined();
    }
  });
});

describe('softwareApplicationSchema', () => {
  it('offers every tier the pricing page renders', () => {
    const tiers = pricingTiers({ lifetime: true });
    const offers = softwareApplicationSchema(BASE, tiers).offers as Record<
      string,
      unknown
    >[];

    expect(offers).toHaveLength(tiers.length);
    expect(offers.map((offer) => offer.price)).toEqual([0, 39, 5, 99]);
  });

  it('omits the founding member offer when that tier is not on sale', () => {
    const tiers = pricingTiers({ lifetime: false });
    const offers = softwareApplicationSchema(BASE, tiers).offers as Record<
      string,
      unknown
    >[];

    // Advertising a lifetime price in schema that the page doesn't show is
    // exactly the mismatch that costs more than having no schema at all.
    expect(offers).toHaveLength(3);
    expect(offers.map((offer) => offer.price)).not.toContain(99);
  });

  it('prices every offer in the tier currency', () => {
    const offers = softwareApplicationSchema(
      BASE,
      pricingTiers({ lifetime: true }),
    ).offers as Record<string, unknown>[];

    for (const offer of offers) {
      expect(offer.priceCurrency).toBe('USD');
    }
  });
});

describe('articleSchema', () => {
  it('describes a guide with its real dates', () => {
    const guide = guideBySlug('polarsteps-alternative');
    const schema = articleSchema(BASE, guide);

    expect(schema['@type']).toBe('Article');
    expect(schema.headline).toBe(guide.headline);
    expect(schema.datePublished).toBe(guide.datePublished);
    expect(schema.dateModified).toBe(guide.dateModified);
  });

  it('points at the guide URL, not the site root', () => {
    const schema = articleSchema(BASE, guideBySlug('private-travel-map'));
    expect(schema.url).toBe('https://minnekart.com/guides/private-travel-map');
    expect(schema.mainEntityOfPage).toBe(schema.url);
  });
});

describe('breadcrumbListSchema', () => {
  it('numbers the trail from one, in order', () => {
    const items = breadcrumbListSchema(BASE, [
      { name: 'Guides', path: '/guides' },
      { name: 'A guide', path: '/guides/a-guide' },
    ]).itemListElement as Record<string, unknown>[];

    expect(items.map((item) => item.position)).toEqual([1, 2]);
    expect(items[0].item).toBe('https://minnekart.com/guides');
    expect(items[1].name).toBe('A guide');
  });
});
