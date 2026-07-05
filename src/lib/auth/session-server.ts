import { cookies } from 'next/headers';

import { db } from '@/db';

import { SessionUser, validateSession } from './session';

export async function getServerSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get('session')?.value;
  if (!token) {
    return null;
  }
  const result = await validateSession(db(), token);
  return result?.user ?? null;
}
