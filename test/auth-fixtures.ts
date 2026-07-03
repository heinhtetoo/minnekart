import { createInvite } from '@/lib/auth/invites';
import { hashPassword } from '@/lib/auth/password';
import { createSession } from '@/lib/auth/session';
import { users } from '@/db/schema';

import { testDb } from './db';

const db = testDb();

export async function createOwner() {
  const [owner] = await db
    .insert(users)
    .values({
      email: 'owner@minnekart.local',
      username: 'owner',
      name: 'Owner',
      passwordHash: 'not-a-real-hash',
      role: 'owner',
      emailVerifiedAt: new Date(),
    })
    .returning();
  return owner;
}

export async function createOwnerWithInvite() {
  const owner = await createOwner();
  const { token } = await createInvite(db, owner.id);
  return { owner, inviteToken: token };
}

export async function mintInvite(ownerId: string) {
  const { token } = await createInvite(db, ownerId);
  return token;
}

const DEFAULT_PASSWORD = 'a-strong-password';

export async function createMember(
  overrides: {
    email?: string;
    username?: string;
    password?: string;
    verified?: boolean;
  } = {},
) {
  const {
    email = 'member@example.com',
    username = 'member',
    password = DEFAULT_PASSWORD,
    verified = false,
  } = overrides;
  const [user] = await db
    .insert(users)
    .values({
      email,
      username,
      name: 'Member',
      passwordHash: await hashPassword(password),
      emailVerifiedAt: verified ? new Date() : null,
    })
    .returning();
  return { user, password };
}

export async function createMemberWithSession(
  overrides: Parameters<typeof createMember>[0] = {},
) {
  const { user, password } = await createMember(overrides);
  const { token } = await createSession(db, user.id);
  return { user, password, sessionToken: token };
}
