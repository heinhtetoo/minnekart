import 'dotenv/config';

import { db } from '@/db';
import { seedDemoData } from '@/db/seed';

seedDemoData(db())
  .then(({ user, tripCount }) => {
    console.log(`Seeded ${tripCount} demo trips for @${user.username}.`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  });
