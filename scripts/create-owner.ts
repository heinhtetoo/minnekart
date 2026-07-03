import 'dotenv/config';

import { db } from '@/db';
import { users } from '@/db/schema';
import { hashPassword } from '@/lib/auth/password';
import { signupSchema } from '@/lib/auth/validation';

async function main() {
  const [email, username, name, password] = process.argv.slice(2);
  if (!email || !username || !name || !password) {
    throw new Error(
      'Usage: npm run create-owner -- <email> <username> <name> <password>',
    );
  }

  const fields = signupSchema
    .omit({ invite: true })
    .parse({ email, username, name, password });

  const [owner] = await db()
    .insert(users)
    .values({
      email: fields.email,
      username: fields.username,
      name: fields.name,
      passwordHash: await hashPassword(fields.password),
      role: 'owner',
      emailVerifiedAt: new Date(),
    })
    .returning();

  console.log(`Created owner @${owner.username} <${owner.email}>.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed to create owner:', error);
    process.exit(1);
  });
