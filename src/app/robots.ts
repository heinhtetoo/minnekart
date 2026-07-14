import type { MetadataRoute } from 'next';

import { env } from '@/lib/env';

export default function robots(): MetadataRoute.Robots {
  const base = env().APP_URL.replace(/\/$/, '');
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // `/t/` is deliberately NOT disallowed. Link-preview crawlers (Twitterbot,
      // facebookexternalhit, Slackbot, WhatsApp) obey robots.txt, so disallowing
      // it stopped them fetching the page and no share link ever previewed.
      // Disallow wouldn't keep the URLs out of the index anyway — it only blocks
      // the fetch. The share page carries `noindex` instead, which actually
      // prevents indexing while still letting a card render. Secrecy comes from
      // the unguessable token and revocation, not from this file.
      disallow: ['/api/', '/admin', '/settings', '/trip/'],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
