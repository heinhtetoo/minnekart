import { FREE_PHOTOS_PER_TRIP, FREE_TRIP_LIMIT } from './limits';

export type PricingTierId = 'free' | 'annual' | 'monthly' | 'lifetime';

export interface PricingTier {
  id: PricingTierId;
  name: string;
  price: string;
  cadence: string;
  summary: string;
  features: string[];
  featured: boolean;
}

export interface PricingCta {
  label: string;
  href: string;
}

const FREE_TIER: PricingTier = {
  id: 'free',
  name: 'Free',
  price: '$0',
  cadence: 'forever',
  summary: `${FREE_TRIP_LIMIT} free memories, ${FREE_PHOTOS_PER_TRIP} photos each.`,
  features: [
    `${FREE_TRIP_LIMIT} memories with ${FREE_PHOTOS_PER_TRIP} photos each`,
    'The whole globe, timeline and gallery',
    'Private by default, with share links you can revoke',
  ],
  featured: false,
};

const ANNUAL_TIER: PricingTier = {
  id: 'annual',
  name: 'Annual',
  price: '$39',
  cadence: 'per year',
  summary: 'Unlimited memories and photos. About $3.25 a month.',
  features: [
    'Unlimited memories and photos',
    'Everything in the free plan',
    'Cancel any time — no lock-in',
  ],
  featured: true,
};

const MONTHLY_TIER: PricingTier = {
  id: 'monthly',
  name: 'Monthly',
  price: '$5',
  cadence: 'per month',
  summary: 'The same thing, month to month.',
  features: ['Unlimited memories and photos', 'Cancel any time'],
  featured: false,
};

const LIFETIME_TIER: PricingTier = {
  id: 'lifetime',
  name: 'Founding member',
  price: '$99',
  cadence: 'once',
  summary: 'Pay once and keep it. For the first people who show up.',
  features: [
    'Unlimited memories and photos, for good',
    'One payment, no renewals',
    'Only while the first cohort is open',
  ],
  featured: false,
};

export function pricingTiers(options: { lifetime: boolean }): PricingTier[] {
  const tiers = [FREE_TIER, ANNUAL_TIER, MONTHLY_TIER];
  return options.lifetime ? [...tiers, LIFETIME_TIER] : tiers;
}

export function pricingCta(tier: PricingTier, loggedIn: boolean): PricingCta {
  if (!loggedIn) {
    return {
      label: tier.id === 'free' ? 'Start free' : 'Create an account',
      href: '/?signup=1',
    };
  }
  if (tier.id === 'free') {
    return { label: 'Go to your globe', href: '/' };
  }
  return { label: 'Upgrade in settings', href: '/settings' };
}
