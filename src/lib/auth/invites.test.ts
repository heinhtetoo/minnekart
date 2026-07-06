import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';

import { invites } from '@/db/schema';

import {
  consumeInvite,
  createInvite,
  findUsableInvite,
  inviteStatus,
  listInvites,
  revokeInvite,
} from './invites';

import { createOwner } from '../../../test/auth-fixtures';
import { resetDb, testDb } from '../../../test/db';

const db = testDb();

beforeEach(async () => {
  await resetDb();
});

describe('listInvites', () => {
  it('returns invites newest first with the redeemer username', async () => {
    const owner = await createOwner();
    const first = await createInvite(db, owner.id, 'for Sofia');
    const second = await createInvite(db, owner.id, 'for Lars');
    await consumeInvite(db, first.invite.id, owner.id);

    const rows = await listInvites(db);

    expect(rows).toHaveLength(2);
    expect(rows[0].invite.id).toBe(second.invite.id);
    expect(rows[1].invite.id).toBe(first.invite.id);
    expect(rows[1].usedByUsername).toBe('owner');
    expect(rows[0].usedByUsername).toBeNull();
  });
});

describe('revokeInvite', () => {
  it('sets revokedAt on an unused invite', async () => {
    const owner = await createOwner();
    const { invite } = await createInvite(db, owner.id);

    const revoked = await revokeInvite(db, invite.id);

    expect(revoked).toBe(true);
    const [row] = await db
      .select()
      .from(invites)
      .where(eq(invites.id, invite.id));
    expect(row.revokedAt).not.toBeNull();
  });

  it('is a no-op for an already-used invite', async () => {
    const owner = await createOwner();
    const { invite } = await createInvite(db, owner.id);
    await consumeInvite(db, invite.id, owner.id);

    const revoked = await revokeInvite(db, invite.id);

    expect(revoked).toBe(false);
  });

  it('is a no-op for an already-revoked invite', async () => {
    const owner = await createOwner();
    const { invite } = await createInvite(db, owner.id);
    await revokeInvite(db, invite.id);

    const revokedAgain = await revokeInvite(db, invite.id);

    expect(revokedAgain).toBe(false);
  });

  it('makes the invite unusable for signup', async () => {
    const owner = await createOwner();
    const { token, invite } = await createInvite(db, owner.id);
    await revokeInvite(db, invite.id);

    expect(await findUsableInvite(db, token)).toBeNull();
  });
});

describe('inviteStatus', () => {
  const base = {
    id: 'x',
    tokenHash: 'h',
    createdBy: 'u',
    note: null,
    expiresAt: new Date(Date.now() + 1000),
    usedBy: null,
    usedAt: null,
    revokedAt: null,
    createdAt: new Date(),
  };

  it('returns unused for a fresh invite', () => {
    expect(inviteStatus(base)).toBe('unused');
  });

  it('returns used when consumed', () => {
    expect(inviteStatus({ ...base, usedAt: new Date() })).toBe('used');
  });

  it('returns revoked when revoked', () => {
    expect(inviteStatus({ ...base, revokedAt: new Date() })).toBe('revoked');
  });

  it('returns expired when past its expiry', () => {
    expect(inviteStatus({ ...base, expiresAt: new Date(Date.now() - 1000) })).toBe(
      'expired',
    );
  });

  it('prefers used over revoked and expired', () => {
    expect(
      inviteStatus({
        ...base,
        usedAt: new Date(),
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() - 1000),
      }),
    ).toBe('used');
  });
});
