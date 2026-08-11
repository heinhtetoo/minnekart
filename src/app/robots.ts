import type { MetadataRoute } from 'next';

import { env } from '@/lib/env';

// `/t/` is deliberately NOT disallowed. Link-preview crawlers (Twitterbot,
// facebookexternalhit, Slackbot, WhatsApp) obey robots.txt, so disallowing it
// stopped them fetching the page and no share link ever previewed. Disallow
// wouldn't keep the URLs out of the index anyway — it only blocks the fetch.
// The share page carries `noindex` instead, which actually prevents indexing
// while still letting a card render. Secrecy comes from the unguessable token
// and revocation, not from this file.
const PRIVATE_ROUTES = ['/api/', '/admin', '/settings', '/trip/'];

// Answer engines that fetch a page to cite it in a response. Being quoted by
// these is the entire point of the GEO work — they are allowed.
const CITATION_BOTS = ['OAI-SearchBot', 'PerplexityBot', 'Claude-SearchBot'];

// Crawlers that collect pages into training corpora. Refusing costs nothing
// measurable: they send no traffic and produce no citations.
//
// `Google-Extended` gates Gemini *training* only — it has no effect on Google
// Search indexing or ranking. Leaving it open in the belief that SEO depends
// on it is the usual mistake.
const TRAINING_BOTS = [
  'GPTBot',
  'ClaudeBot',
  'CCBot',
  'Google-Extended',
  'Applebot-Extended',
];

export default function robots(): MetadataRoute.Robots {
  const base = env().APP_URL.replace(/\/$/, '');
  return {
    // A crawler obeys exactly ONE group — its most specific `User-agent`
    // match — and inherits nothing from `*`. So the citation group repeats
    // PRIVATE_ROUTES; without that, naming those bots would *grant* them the
    // routes the catch-all keeps out.
    //
    // robots.txt is advisory. It stops the compliant and nothing else. Bot
    // names also rot — check each against its vendor's docs when editing.
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: PRIVATE_ROUTES,
      },
      {
        // Cite us, but not our users: `/u/<username>` being opt-in public
        // meant "someone can visit my globe", not "my travel history is in
        // an answer engine's corpus". Google still indexes `/u/` normally —
        // this closes it to AI crawlers only.
        userAgent: CITATION_BOTS,
        allow: '/',
        disallow: [...PRIVATE_ROUTES, '/u/'],
      },
      {
        userAgent: TRAINING_BOTS,
        disallow: '/',
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
