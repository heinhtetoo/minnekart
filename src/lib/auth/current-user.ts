import { DatabaseExecutor } from '@/db';

import { readSessionToken } from './cookies';
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
