import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

import demoTrips from '@/data/demo-trips.json';

import * as schema from './schema';
import { trips, users } from './schema';

type Database = NodePgDatabase<typeof schema>;

const DEMO_USER = {
  email: 'demo@minnekart.local',
  username: 'demo',
  name: 'Demo Explorer',
  passwordHash: 'seed-demo-account-cannot-log-in',
};

export async function seedDemoData(database: Database) {
  const [demoUser] = await database
    .insert(users)
    .values(DEMO_USER)
    .onConflictDoUpdate({
      target: users.email,
      set: { name: DEMO_USER.name },
    })
    .returning();

  await database.delete(trips).where(eq(trips.userId, demoUser.id));
  const insertedTrips = await database
    .insert(trips)
    .values(
      demoTrips.map((trip) => ({
        userId: demoUser.id,
        placeName: trip.placeName,
        country: trip.country,
        lat: trip.lat,
        lng: trip.lng,
        dateStart: trip.dateStart,
        dateEnd: trip.dateEnd,
        highlight: trip.highlight,
        story: trip.story,
      })),
    )
    .returning();

  return { user: demoUser, tripCount: insertedTrips.length };
}
