import { describe, expect, it } from 'vitest';

import { FREE_PHOTOS_PER_TRIP, FREE_TRIP_LIMIT } from './limits';
import { pricingCta, pricingTiers } from './pricing';

describe('pricingTiers', () => {
  it('offers free, annual and monthly when no lifetime price is set', () => {
    const ids = pricingTiers({ lifetime: false }).map((tier) => tier.id);
    expect(ids).toEqual(['free', 'annual', 'monthly']);
  });

  it('adds the founding member tier when a lifetime price is set', () => {
    const ids = pricingTiers({ lifetime: true }).map((tier) => tier.id);
    expect(ids).toEqual(['free', 'annual', 'monthly', 'lifetime']);
  });

  it('features the annual tier as the primary offer', () => {
    const featured = pricingTiers({ lifetime: true }).filter(
      (tier) => tier.featured,
    );
    expect(featured.map((tier) => tier.id)).toEqual(['annual']);
  });

  it('describes the free tier with the enforced limits', () => {
    const [free] = pricingTiers({ lifetime: false });
    expect(free.price).toBe('$0');
    expect(free.summary).toContain(String(FREE_TRIP_LIMIT));
    expect(free.summary).toContain(String(FREE_PHOTOS_PER_TRIP));
  });

  it('prices the paid tiers as advertised', () => {
    const tiers = pricingTiers({ lifetime: true });
    const priceOf = (id: string) =>
      tiers.find((tier) => tier.id === id)?.price ?? '';
    expect(priceOf('annual')).toBe('$39');
    expect(priceOf('monthly')).toBe('$5');
    expect(priceOf('lifetime')).toBe('$99');
  });
});

describe('pricingCta', () => {
  it('sends a signed out visitor to signup from every tier', () => {
    const links = pricingTiers({ lifetime: true }).map(
      (tier) => pricingCta(tier, false).href,
    );
    expect(links).toEqual([
      '/?signup=1',
      '/?signup=1',
      '/?signup=1',
      '/?signup=1',
    ]);
  });

  it('sends a signed in visitor to settings to upgrade', () => {
    const [free, annual] = pricingTiers({ lifetime: false });
    expect(pricingCta(free, true).href).toBe('/');
    expect(pricingCta(annual, true).href).toBe('/settings');
    expect(pricingCta(annual, true).label).toBe('Upgrade in settings');
  });
});
