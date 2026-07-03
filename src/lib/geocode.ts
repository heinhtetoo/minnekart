const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'Minnekart/0.1 (https://minnekart.vercel.app)';
const RESULT_LIMIT = 5;

export interface PlaceResult {
  placeName: string;
  country: string;
  lat: number;
  lng: number;
  displayName: string;
}

interface NominatimItem {
  lat: string;
  lon: string;
  name?: string;
  display_name: string;
  address?: Record<string, string>;
}

export async function searchPlaces(
  query: string,
  fetchImpl: typeof fetch = fetch,
): Promise<PlaceResult[]> {
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const url = new URL(NOMINATIM_URL);
  url.searchParams.set('q', trimmed);
  url.searchParams.set('format', 'json');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', String(RESULT_LIMIT));

  const response = await fetchImpl(url, {
    headers: { 'user-agent': USER_AGENT, 'accept-language': 'en' },
  });
  if (!response.ok) {
    throw new Error(`Geocoding failed with status ${response.status}`);
  }

  const items = (await response.json()) as NominatimItem[];
  return items.map(toPlaceResult);
}

function toPlaceResult(item: NominatimItem): PlaceResult {
  const address = item.address ?? {};
  const placeName =
    item.name ||
    address.city ||
    address.town ||
    address.village ||
    address.hamlet ||
    address.county ||
    item.display_name.split(',')[0].trim();
  return {
    placeName,
    country: address.country ?? '',
    lat: Number.parseFloat(item.lat),
    lng: Number.parseFloat(item.lon),
    displayName: item.display_name,
  };
}
