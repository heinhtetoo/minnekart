import type { MetadataRoute } from 'next';

import { env } from '@/lib/env';

const PUBLIC_ROUTES = [
  '/',
  '/about',
  '/guides',
  '/guides/private-travel-map',
  '/guides/polarsteps-alternative',
  '/pricing',
  '/terms',
  '/privacy',
  '/refunds',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = env().APP_URL.replace(/\/$/, '');
  const lastModified = new Date();
  return PUBLIC_ROUTES.map((route) => ({
    url: `${base}${route}`,
    lastModified,
  }));
}
