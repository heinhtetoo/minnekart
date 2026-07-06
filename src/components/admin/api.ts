import { apiRequest, jsonBody } from '@/lib/http/client';

export const invitesApi = {
  create: (note?: string) =>
    apiRequest<{ token: string; id: string; url: string }>(
      '/api/admin/invites',
      jsonBody('POST', { note }),
    ),
  revoke: (id: string) =>
    apiRequest<{ ok: true }>(`/api/admin/invites/${id}`, { method: 'DELETE' }),
};
