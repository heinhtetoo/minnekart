import { describe, expect, it } from 'vitest';

import robots from './robots';

type Rule = { userAgent?: string | string[]; disallow?: string | string[] };

function rules(): Rule[] {
  const value = robots().rules;
  return Array.isArray(value) ? value : [value];
}

function ruleFor(agent: string): Rule {
  const match = rules().find((rule) => {
    const agents = Array.isArray(rule.userAgent)
      ? rule.userAgent
      : [rule.userAgent];
    return agents.includes(agent);
  });
  if (!match) {
    throw new Error(`No robots rule names ${agent}`);
  }
  return match;
}

function disallowList(rule: Rule): string[] {
  if (!rule.disallow) {
    return [];
  }
  return Array.isArray(rule.disallow) ? rule.disallow : [rule.disallow];
}

describe('robots — the catch-all group', () => {
  it('does not disallow /t/, or share links would never preview', () => {
    // Twitterbot, facebookexternalhit, Slackbot and WhatsApp all obey
    // robots.txt. Disallowing /t/ stopped them fetching the page, so no link
    // preview rendered. The share page carries `noindex` instead — that keeps
    // it out of search while still letting a card render.
    expect(disallowList(ruleFor('*'))).not.toContain('/t/');
  });

  it('keeps the private and session-only routes out', () => {
    expect(disallowList(ruleFor('*'))).toEqual(
      expect.arrayContaining(['/api/', '/admin', '/settings', '/trip/']),
    );
  });

  it('leaves the public globe open to ordinary search crawlers', () => {
    // /u/ is closed to AI crawlers only. Google indexing it is the point of
    // it being opt-in public.
    expect(disallowList(ruleFor('*'))).not.toContain('/u/');
  });

  it('points at the sitemap on the configured base URL', () => {
    expect(robots().sitemap).toBe('http://localhost:3000/sitemap.xml');
  });
});

describe('robots — citation crawlers', () => {
  // A crawler obeys only its most specific group and inherits nothing from
  // `*`, so naming these bots without repeating the private routes would
  // hand them everything the catch-all keeps out. This is the test that
  // catches that inversion.
  it.each(['OAI-SearchBot', 'PerplexityBot', 'Claude-SearchBot'])(
    'still hides the private routes from %s',
    (agent) => {
      expect(disallowList(ruleFor(agent))).toEqual(
        expect.arrayContaining(['/api/', '/admin', '/settings', '/trip/']),
      );
    },
  );

  it('lets them reach the pages worth citing', () => {
    expect(ruleFor('OAI-SearchBot').disallow).not.toContain('/');
  });

  it('closes the public globe to them — cite us, not our users', () => {
    expect(disallowList(ruleFor('PerplexityBot'))).toContain('/u/');
  });
});

describe('robots — training crawlers', () => {
  it.each([
    'GPTBot',
    'ClaudeBot',
    'CCBot',
    'Google-Extended',
    'Applebot-Extended',
  ])('refuses %s the whole site', (agent) => {
    expect(disallowList(ruleFor(agent))).toContain('/');
  });

  it('does not confuse Google-Extended with Googlebot', () => {
    // Google-Extended gates Gemini training only. Blocking Googlebot would
    // deindex the site; these must never end up in the same group.
    const trainingAgents = ruleFor('Google-Extended').userAgent;
    expect(trainingAgents).not.toContain('Googlebot');
  });
});
