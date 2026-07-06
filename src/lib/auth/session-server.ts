import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { db } from '@/db';

import { isVerified } from './current-user';
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

export async function requireVerifiedPageUser(): Promise<SessionUser> {
  const user = await getServerSessionUser();
  if (!user || !isVerified(user)) {
    redirect('/');
  }
  return user;
}

export async function requireOwnerPageUser(): Promise<SessionUser> {
  const user = await requireVerifiedPageUser();
  if (user.role !== 'owner') {
    redirect('/');
  }
  return user;
}
