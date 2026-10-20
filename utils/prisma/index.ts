import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  // The Lightsail Postgres presents a self-signed cert. Newer `pg` treats
  // sslmode=require as verify-full, which rejects it — so verify against the
  // box's own CA (DATABASE_CA, PEM) instead. Required: fail closed rather than
  // skip verification, so a missing CA is a loud boot error, not an
  // unverified prod connection nobody notices.
  const ca = process.env.DATABASE_CA?.trim();
  if (!ca) throw new Error('DATABASE_CA is required (PEM for the Postgres server CA)');
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    ssl: { ca },
  });
  return new PrismaClient({ adapter });
}

const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
