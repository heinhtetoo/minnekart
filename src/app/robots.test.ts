import { describe, expect, it } from 'vitest';

import robots from './robots';

function disallowed(): string[] {
  const rules = robots().rules;
  const rule = Array.isArray(rules) ? rules[0] : rules;
  return (rule.disallow as string[]) ?? [];
}

describe('robots', () => {
  it('does not disallow /t/, or share links would never preview', () => {
    // Twitterbot, facebookexternalhit, Slackbot and WhatsApp all obey
    // robots.txt. Disallowing /t/ stopped them fetching the page, so no link
    // preview rendered. The share page carries `noindex` instead — that keeps
    // it out of search while still letting a card render.
    expect(disallowed()).not.toContain('/t/');
  });

  it('keeps the private and session-only routes out', () => {
    expect(disallowed()).toEqual(
      expect.arrayContaining(['/api/', '/admin', '/settings', '/trip/']),
    );
  });

  it('points at the sitemap on the configured base URL', () => {
    expect(robots().sitemap).toBe('http://localhost:3000/sitemap.xml');
  });
});
