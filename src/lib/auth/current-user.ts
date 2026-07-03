import { DatabaseExecutor } from '@/db';

import { readSessionToken } from './cookies';
import { jsonResponse } from './http';
import { SessionUser, validateSession } from './session';

export async function getSessionUser(
  database: DatabaseExecutor,
  request: Request,
): Promise<SessionUser | null> {
  const token = readSessionToken(request);
  if (!token) {
    return null;
  }
  const result = await validateSession(database, token);
  return result?.user ?? null;
}

export function isVerified(user: SessionUser): boolean {
  return user.emailVerifiedAt !== null;
}

export type GuardResult =
  | { user: SessionUser; response?: undefined }
  | { user?: undefined; response: Response };

export async function requireVerifiedUser(
  database: DatabaseExecutor,
  request: Request,
): Promise<GuardResult> {
  const user = await getSessionUser(database, request);
  if (!user) {
    return { response: jsonResponse({ error: 'unauthenticated' }, 401) };
  }
  if (!isVerified(user)) {
    return { response: jsonResponse({ error: 'email_unverified' }, 403) };
  }
  return { user };
}
