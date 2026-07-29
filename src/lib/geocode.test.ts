import { describe, expect, it, vi } from 'vitest';

import { reverseGeocode, searchPlaces } from './geocode';

const nominatimPayload = [
  {
    lat: '35.0116',
    lon: '135.7681',
    name: 'Kyoto',
    display_name: 'Kyoto, Japan',
    address: { city: 'Kyoto', country: 'Japan' },
  },
  {
    lat: '34.6851',
    lon: '135.8049',
    name: 'Nara',
    display_name: 'Nara, Japan',
    address: { town: 'Nara', country: 'Japan' },
  },
];

function stubFetch(payload: unknown) {
  return vi.fn<typeof fetch>(async () => new Response(JSON.stringify(payload)));
}

describe('searchPlaces', () => {
  it('maps a Nominatim payload to normalised results', async () => {
    const results = await searchPlaces('kyoto', stubFetch(nominatimPayload));

    expect(results).toEqual([
      {
        placeName: 'Kyoto',
        country: 'Japan',
        lat: 35.0116,
        lng: 135.7681,
        displayName: 'Kyoto, Japan',
      },
      {
        placeName: 'Nara',
        country: 'Japan',
        lat: 34.6851,
        lng: 135.8049,
        displayName: 'Nara, Japan',
      },
    ]);
  });

  it('sends the query and an identifying User-Agent to Nominatim', async () => {
    const fetchImpl = stubFetch(nominatimPayload);

    await searchPlaces('kyoto', fetchImpl);

    const [url, init] = fetchImpl.mock.calls[0];
    expect(String(url)).toContain('q=kyoto');
    expect(String(url)).toContain('format=json');
    const headers = new Headers(init?.headers);
    expect(headers.get('user-agent')).toMatch(/Minnekart/);
    expect(headers.get('accept-language')).toBe('en');
  });

  it('returns an empty list for a blank query without calling fetch', async () => {
    const fetchImpl = stubFetch(nominatimPayload);

    const results = await searchPlaces('   ', fetchImpl);

    expect(results).toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

const reversePayload = {
  lat: '35.0116',
  lon: '135.7681',
  name: 'Kyoto',
  display_name: 'Kyoto, Japan',
  address: { city: 'Kyoto', country: 'Japan' },
};

describe('reverseGeocode', () => {
  it('maps a Nominatim reverse payload to a normalised place', async () => {
    const place = await reverseGeocode(
      35.0116,
      135.7681,
      stubFetch(reversePayload),
    );

    expect(place).toEqual({
      placeName: 'Kyoto',
      country: 'Japan',
      lat: 35.0116,
      lng: 135.7681,
      displayName: 'Kyoto, Japan',
    });
  });

  it('sends the coordinates and an identifying User-Agent to Nominatim', async () => {
    const fetchImpl = stubFetch(reversePayload);

    await reverseGeocode(35.0116, 135.7681, fetchImpl);

    const [url, init] = fetchImpl.mock.calls[0];
    expect(String(url)).toContain('/reverse');
    expect(String(url)).toContain('lat=35.0116');
    expect(String(url)).toContain('lon=135.7681');
    expect(String(url)).toContain('format=json');
    const headers = new Headers(init?.headers);
    expect(headers.get('user-agent')).toMatch(/Minnekart/);
    expect(headers.get('accept-language')).toBe('en');
  });

  it('returns null when Nominatim cannot place the coordinates', async () => {
    const place = await reverseGeocode(
      -80,
      -170,
      stubFetch({ error: 'Unable to geocode' }),
    );

    expect(place).toBeNull();
  });

  it('throws when Nominatim responds with an error status', async () => {
    const fetchImpl = vi.fn<typeof fetch>(
      async () => new Response('nope', { status: 503 }),
    );

    await expect(reverseGeocode(35.0116, 135.7681, fetchImpl)).rejects.toThrow(
      /503/,
    );
  });
});
