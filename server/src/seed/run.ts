import mongoose from 'mongoose';
import { z } from 'zod';
import { connectDatabase } from '../lib/db.js';
import { addDays } from '../lib/dates.js';
import { hashPassword, passwordProblem } from '../modules/auth/password.js';
import { UserModel } from '../modules/auth/user.model.js';
import { DestinationModel } from '../modules/destinations/destination.model.js';
import { TripModel } from '../modules/trips/trip.model.js';
import { seedDestinations } from './seed.js';

const write = (line: string) => process.stdout.write(`${line}\n`);

const demoEnv = z.object({
  DEMO_USER_EMAIL: z.email('DEMO_USER_EMAIL must be an email address').transform((value) => value.toLowerCase()),
  DEMO_USER_PASSWORD: z.string().min(10, 'DEMO_USER_PASSWORD must be at least 10 characters'),
});

/** Creates a demo account with one sample trip. Never modifies an existing account. */
async function seedDemoUser(): Promise<void> {
  const parsed = demoEnv.safeParse(process.env);
  if (!parsed.success) {
    write(`Skipping demo user: ${parsed.error.issues.map((issue) => issue.message).join('; ')}`);
    return;
  }
  const { DEMO_USER_EMAIL: email, DEMO_USER_PASSWORD: password } = parsed.data;
  const problem = passwordProblem(password, email);
  if (problem) {
    write(`Skipping demo user: ${problem}`);
    return;
  }
  if (await UserModel.exists({ email })) {
    write('Demo user already exists; left unchanged.');
    return;
  }
  const user = await UserModel.create({ displayName: 'Demo traveller', email, passwordHash: await hashPassword(password) });
  const kyoto = await DestinationModel.findOne({ slug: 'kyoto' });

  const today = new Date().toISOString().slice(0, 10);
  const start = addDays(today, 45);
  await TripModel.create({
    userId: user._id,
    title: 'Autumn in Kyoto',
    destinationIds: kyoto ? [kyoto._id] : [],
    startDate: start,
    endDate: addDays(start, 3),
    travelerCount: 2,
    currency: 'INR',
    budgetTargetMinor: 30_000_000,
    notes: 'Sample trip created by the demo seed.',
    days: [0, 1, 2, 3].map((offset) => ({
      date: addDays(start, offset),
      activities:
        offset === 0
          ? [
              { title: 'Arrive and check in', category: 'accommodation', time: '15:00', location: 'Higashiyama', notes: '', estimatedCostMinor: 2_400_000 },
              { title: 'Evening walk through Gion', category: 'activities', time: '18:30', location: 'Gion', notes: '', estimatedCostMinor: 0 },
            ]
          : offset === 1
            ? [
                { title: 'Fushimi Inari at opening', category: 'activities', time: '07:00', location: 'Fushimi', notes: 'Take the JR Nara line.', estimatedCostMinor: 0 },
                { title: 'Lunch at Nishiki Market', category: 'food', time: '12:30', location: 'Nishiki Market', notes: '', estimatedCostMinor: 400_000 },
              ]
            : [],
    })),
  });
  write(`Created demo user ${email} with one sample trip.`);
}

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/voyage';
  await connectDatabase(uri);
  await DestinationModel.syncIndexes();
  const { upserted, updated } = await seedDestinations();
  write(`Destinations: ${upserted} inserted, ${updated} updated.`);
  if (process.argv.includes('--demo')) await seedDemoUser();
  await mongoose.disconnect();
}

main().catch(async (error: unknown) => {
  process.stderr.write(`Seed failed: ${error instanceof Error ? error.message : 'unknown error'}\n`);
  await mongoose.disconnect();
  process.exit(1);
});
