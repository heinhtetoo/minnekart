import { db } from '@/db';
import { getSessionUser } from '@/lib/auth/current-user';
import { jsonResponse } from '@/lib/auth/http';

export async function GET(request: Request): Promise<Response> {
  const user = await getSessionUser(db(), request);
  if (!user) {
    return jsonResponse({ error: 'unauthenticated' }, 401);
  }
  return jsonResponse({
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      role: user.role,
      globePublic: user.globePublic,
      emailVerified: user.emailVerifiedAt !== null,
    },
  });
}
