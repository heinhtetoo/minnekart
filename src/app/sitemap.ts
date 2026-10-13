import type { MetadataRoute } from 'next';

import { env } from '@/lib/env';
import { GUIDES, guidePath } from '@/lib/seo/guides';

// Pages whose content changes only when we deploy a copy edit. They carry no
// `lastModified`: stamping `new Date()` on every route made each deploy claim
// every page had changed, which teaches crawlers to ignore the field. Omitting
// it is honest; the guides below carry real dates, so the field still means
// something where it appears.
const STATIC_ROUTES = [
  '/',
  '/about',
  '/guides',
  '/pricing',
  '/terms',
  '/privacy',
  '/refunds',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = env().APP_URL.replace(/\/$/, '');
  return [
    ...STATIC_ROUTES.map((route) => ({ url: `${base}${route}` })),
    ...GUIDES.map((guide) => ({
      url: `${base}${guidePath(guide)}`,
      lastModified: new Date(guide.dateModified),
    })),
  ];
}
