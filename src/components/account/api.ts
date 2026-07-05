import { apiRequest, jsonBody } from '@/lib/http/client';

export const accountApi = {
  setGlobePublic: (isPublic: boolean) =>
    apiRequest<{ globePublic: boolean; url: string }>(
      '/api/account/globe',
      jsonBody('PATCH', { public: isPublic }),
    ),
};
