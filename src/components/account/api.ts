import { apiRequest, jsonBody } from '@/lib/http/client';

export interface ProfileInput {
  name: string;
  tagline: string;
  headline: string;
  bio: string;
}

export const accountApi = {
  setGlobePublic: (isPublic: boolean) =>
    apiRequest<{ globePublic: boolean; url: string }>(
      '/api/account/globe',
      jsonBody('PATCH', { public: isPublic }),
    ),
  updateProfile: (input: ProfileInput) =>
    apiRequest<ProfileInput>('/api/account/profile', jsonBody('PATCH', input)),
  deleteAccount: (password: string) =>
    apiRequest<{ ok: boolean }>(
      '/api/account',
      jsonBody('DELETE', { password }),
    ),
};
