import type { MetadataRoute } from 'next';

import { env } from '@/lib/env';

export default function robots(): MetadataRoute.Robots {
  const base = env().APP_URL.replace(/\/$/, '');
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Share links are secret-by-token, and the rest needs a session.
      disallow: ['/t/', '/api/', '/admin', '/settings', '/trip/'],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
