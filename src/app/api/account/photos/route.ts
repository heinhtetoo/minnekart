import { z } from 'zod';

import { db } from '@/db';
import { requireVerifiedUser } from '@/lib/auth/current-user';
import { jsonResponse } from '@/lib/auth/http';
import { userLibraryPage } from '@/lib/photos/library';

const querySchema = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  country: z.string().trim().max(100).nullable().default(null),
});

export async function GET(request: Request): Promise<Response> {
  const database = db();
  const guard = await requireVerifiedUser(database, request);
  if (guard.response) {
    return guard.response;
  }

  const params = new URL(request.url).searchParams;
  const parsed = querySchema.safeParse({
    offset: params.get('offset') ?? undefined,
    country: params.get('country'),
  });
  if (!parsed.success) {
    return jsonResponse({ error: 'invalid_request' }, 400);
  }

  const page = await userLibraryPage(guard.user.id, parsed.data);
  return jsonResponse(page, 200);
}
