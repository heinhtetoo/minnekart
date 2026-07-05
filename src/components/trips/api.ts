import { apiRequest, jsonBody } from '@/lib/http/client';
import { PlaceResult } from '@/lib/geocode';
import { TripDTO } from '@/lib/trips/dto';
import { CreateTripInput, UpdateTripInput } from '@/lib/trips/validation';

export const tripsApi = {
  create: (body: CreateTripInput) =>
    apiRequest<{ trip: TripDTO }>('/api/trips', jsonBody('POST', body)),
  update: (id: string, body: UpdateTripInput) =>
    apiRequest<{ trip: TripDTO }>(`/api/trips/${id}`, jsonBody('PATCH', body)),
  remove: (id: string) =>
    apiRequest<{ ok: true }>(`/api/trips/${id}`, { method: 'DELETE' }),
  get: (id: string) => apiRequest<{ trip: TripDTO }>(`/api/trips/${id}`),
};

export const geocodeApi = {
  search: (query: string) =>
    apiRequest<{ results: PlaceResult[] }>(
      `/api/geocode?q=${encodeURIComponent(query)}`,
    ),
};
