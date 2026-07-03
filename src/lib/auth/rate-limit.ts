import { and, eq, lt, sql } from 'drizzle-orm';

import { DatabaseExecutor } from '@/db';
import { rateLimits } from '@/db/schema';

export async function consumeRateLimit(
  database: DatabaseExecutor,
  key: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);

  const [row] = await database
    .insert(rateLimits)
    .values({ key, windowStart })
    .onConflictDoUpdate({
      target: [rateLimits.key, rateLimits.windowStart],
      set: { count: sql`${rateLimits.count} + 1` },
    })
    .returning();

  if (row.count === 1) {
    await database
      .delete(rateLimits)
      .where(
        and(eq(rateLimits.key, key), lt(rateLimits.windowStart, windowStart)),
      );
  }

  return row.count <= limit;
}
