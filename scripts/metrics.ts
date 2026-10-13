import 'dotenv/config';

import { db } from '@/db';
import { FREE_TRIP_LIMIT } from '@/lib/billing/limits';
import { collectMetrics } from '@/lib/metrics/queries';

// Product metrics, read-only, straight out of Postgres. No collection and no
// third-party script — these are questions asked of rows that were always
// there, which is also why a question asked today can look at any past period.
//
// Run against production with the prod DATABASE_URL in the environment.

function percent(rate: number | null): string {
  return rate === null ? 'n/a' : `${(rate * 100).toFixed(1)}%`;
}

function heading(text: string): string {
  return `\n${text}\n${'-'.repeat(text.length)}`;
}

async function main() {
  const m = await collectMetrics(db());

  console.log(
    `Minnekart metrics — ${new Intl.DateTimeFormat('en-AU', {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(new Date())}`,
  );

  console.log(heading('Who is here'));
  console.log(`  Free                ${m.planMix.free}`);
  console.log(`  Subscribers         ${m.planMix.subscriber}`);
  console.log(`  Founding members    ${m.planMix.foundingMember}`);
  console.log(`  Grandfathered       ${m.planMix.grandfathered}`);
  console.log(
    '  (grandfathered accounts were moved to paid by migration 0002 and',
  );
  console.log('   never converted — they are excluded from conversion below)');

  console.log(heading('Activation'));
  console.log(
    `  First memory within 24h   ${m.activation.activated}/${m.activation.signups}  ${percent(m.activation.rate)}`,
  );

  console.log(heading('The free ceiling'));
  console.log(
    `  At or over ${FREE_TRIP_LIMIT} memories     ${m.capPressure.atCap}`,
  );
  console.log(
    `  ...of whom are paying     ${m.capPressure.atCapAndPaid}  (correlation only)`,
  );

  console.log(heading('Depth'));
  console.log(`  Median memories per user  ${m.depth.medianTrips}`);
  console.log(`  Median photos per user    ${m.depth.medianPhotos}`);

  console.log(heading('Retention (activity, not logins)'));
  console.log(
    `  Added something after 30d ${m.retention.returned}/${m.retention.eligible}  ${percent(m.retention.rate)}`,
  );
  console.log(
    '  (sessions renew in place, so they cannot answer "did they come back";',
  );
  console.log('   this counts creating a memory or photo instead)');

  console.log(heading('Conversion'));
  if (m.conversion.recorded === 0) {
    // Never print 0% here. An empty history and a real zero look identical in
    // a percentage, and only one of them means anything.
    console.log('  No plan changes recorded yet.');
    console.log(
      '  plan_events only captures from the day it shipped; there is no',
    );
    console.log('  way to reconstruct changes from before that.');
  } else {
    console.log(
      `  Converted                 ${m.conversion.converted}/${m.conversion.eligible}  ${percent(m.conversion.rate)}`,
    );
    console.log(
      `  Median days to convert    ${
        m.conversion.medianDaysToConvert === null
          ? 'n/a'
          : m.conversion.medianDaysToConvert.toFixed(1)
      }`,
    );
  }

  console.log(heading('Not measured, deliberately'));
  console.log('  Anyone who visited and left without signing up, and every');
  console.log('  non-search referral. That is the price of the no-analytics');
  console.log('  promise, and it is accepted rather than overlooked.');
  console.log('');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed to collect metrics:', error);
    process.exit(1);
  });
