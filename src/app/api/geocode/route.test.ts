import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from './route';

import { createMemberWithSession } from '../../../../test/auth-fixtures';
import { resetDb } from '../../../../test/db';
import { cookieHeader, getRequest } from '../../../../test/http';

const nominatimPayload = [
  {
    lat: '35.0116',
    lon: '135.7681',
    name: 'Kyoto',
    display_name: 'Kyoto, Japan',
    address: { city: 'Kyoto', country: 'Japan' },
  },
];

function urlFor(query: string) {
  return `http://test/api/geocode?q=${encodeURIComponent(query)}`;
}

beforeEach(async () => {
  await resetDb();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(nominatimPayload))),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GET /api/geocode', () => {
  it('returns normalised results for an authenticated user', async () => {
    const { sessionToken } = await createMemberWithSession({ verified: true });

    const response = await GET(
      getRequest(urlFor('kyoto'), cookieHeader(sessionToken)),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.results[0]).toMatchObject({
      placeName: 'Kyoto',
      country: 'Japan',
    });
  });

  it('rejects an unauthenticated request', async () => {
    const response = await GET(getRequest(urlFor('kyoto')));

    expect(response.status).toBe(401);
  });

  it('returns an empty list for a blank query', async () => {
    const { sessionToken } = await createMemberWithSession({ verified: true });

    const response = await GET(
      getRequest(urlFor('  '), cookieHeader(sessionToken)),
    );

    expect(response.status).toBe(200);
    expect((await response.json()).results).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rate-limits a burst of requests', async () => {
    const { sessionToken } = await createMemberWithSession({ verified: true });
    const request = () =>
      GET(getRequest(urlFor('kyoto'), cookieHeader(sessionToken)));

    for (let i = 0; i < 20; i += 1) {
      expect((await request()).status).toBe(200);
    }

    expect((await request()).status).toBe(429);
  });
});
