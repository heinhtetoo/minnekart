import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from './route';

import { createMemberWithSession } from '../../../../../test/auth-fixtures';
import { resetDb } from '../../../../../test/db';
import { cookieHeader, getRequest } from '../../../../../test/http';

const reversePayload = {
  lat: '35.0116',
  lon: '135.7681',
  name: 'Kyoto',
  display_name: 'Kyoto, Japan',
  address: { city: 'Kyoto', country: 'Japan' },
};

function urlFor(lat: string, lng: string) {
  return `http://test/api/geocode/reverse?lat=${lat}&lng=${lng}`;
}

beforeEach(async () => {
  await resetDb();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(reversePayload))),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GET /api/geocode/reverse', () => {
  it('returns a normalised place for an authenticated user', async () => {
    const { sessionToken } = await createMemberWithSession({ verified: true });

    const response = await GET(
      getRequest(urlFor('35.0116', '135.7681'), cookieHeader(sessionToken)),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.place).toMatchObject({
      placeName: 'Kyoto',
      country: 'Japan',
      lat: 35.0116,
      lng: 135.7681,
    });
  });

  it('rejects an unauthenticated request', async () => {
    const response = await GET(getRequest(urlFor('35.0116', '135.7681')));

    expect(response.status).toBe(401);
  });

  it('rejects coordinates that are not numbers', async () => {
    const { sessionToken } = await createMemberWithSession({ verified: true });

    const response = await GET(
      getRequest(urlFor('kyoto', 'japan'), cookieHeader(sessionToken)),
    );

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe('invalid_request');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects coordinates outside the valid range', async () => {
    const { sessionToken } = await createMemberWithSession({ verified: true });

    const response = await GET(
      getRequest(urlFor('91', '135.7681'), cookieHeader(sessionToken)),
    );

    expect(response.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects a request with missing coordinates', async () => {
    const { sessionToken } = await createMemberWithSession({ verified: true });

    const response = await GET(
      getRequest('http://test/api/geocode/reverse', cookieHeader(sessionToken)),
    );

    expect(response.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns a null place when Nominatim cannot place the point', async () => {
    const { sessionToken } = await createMemberWithSession({ verified: true });
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: 'Unable to geocode' })),
      ),
    );

    const response = await GET(
      getRequest(urlFor('-80', '-170'), cookieHeader(sessionToken)),
    );

    expect(response.status).toBe(200);
    expect((await response.json()).place).toBeNull();
  });

  it('rate-limits a burst of requests', async () => {
    const { sessionToken } = await createMemberWithSession({ verified: true });
    const request = () =>
      GET(
        getRequest(urlFor('35.0116', '135.7681'), cookieHeader(sessionToken)),
      );

    for (let i = 0; i < 20; i += 1) {
      expect((await request()).status).toBe(200);
    }

    expect((await request()).status).toBe(429);
  });
});
