import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_PROFILE_KEY = 'default-match-calibration-v1';

async function main() {
  console.log('Starting events calibration seeding...');

  const payload = {
    attackFrequencyMultiplier: 1.15, // Slightly more attacks for excitement
    goalProbabilityMultiplier: 0.88, // Lower base goal prob to match real xG conversion
    bigChanceMultiplier: 1.05,
    cardRateMultiplier: 1.20, // Slightly more cards based on modern football
    injuryRateMultiplier: 0.90, // Reduced injuries to avoid annoying users too much
    zoneBias: {
      left: 1.05,
      center: 0.90, // Modern football forces more wide play
      right: 1.05,
    },
  };

  const profile = await prisma.matchCalibrationProfile.upsert({
    where: { key: DEFAULT_PROFILE_KEY },
    update: {
      payload,
      sourceName: 'football-events-calibration-v1',
      sourceVersion: '1.0',
    },
    create: {
      key: DEFAULT_PROFILE_KEY,
      sourceName: 'football-events-calibration-v1',
      sourceVersion: '1.0',
      payload,
    },
  });

  console.log(`Successfully seeded MatchCalibrationProfile with key: ${profile.key}`);
}

main()
  .catch((e) => {
    console.error('Error seeding calibration:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
