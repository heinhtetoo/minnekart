import 'dotenv/config';

import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { users } from '@/db/schema';
import { createInvite } from '@/lib/auth/invites';
import { env } from '@/lib/env';

async function main() {
  const note = process.argv.slice(2).join(' ') || undefined;
  const database = db();

  const [owner] = await database
    .select()
    .from(users)
    .where(eq(users.role, 'owner'))
    .limit(1);
  if (!owner) {
    throw new Error('No owner account found. Run create-owner first.');
  }

  const { token } = await createInvite(database, owner.id, note);
  console.log(`Invite link: ${env().APP_URL}/signup?invite=${token}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed to create invite:', error);
    process.exit(1);
  });
