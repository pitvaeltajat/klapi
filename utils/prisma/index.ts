import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { X509Certificate } from 'node:crypto';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  // The Lightsail Postgres presents a self-signed cert. Newer `pg` treats
  // sslmode=require as verify-full, which rejects it — so verify against the
  // box's own CA (DATABASE_CA, PEM) instead. Required: fail closed rather than
  // skip verification, so a missing CA is a loud boot error, not an
  // unverified prod connection nobody notices.
  const ca = process.env.DATABASE_CA?.trim();
  if (!ca) throw new Error('DATABASE_CA is required (PEM for the Postgres server CA)');
  // pg's ConnectionParameters does `Object.assign({}, config, parse(connectionString))`,
  // so a `sslmode=` in the URL overwrites the explicit `ssl` below — turning into
  // verify-full with no CA, which rejects the self-signed Lightsail cert. Strip the
  // sslmode params so TLS is driven solely by the pinned CA.
  const url = new URL(process.env.DATABASE_URL ?? '');
  url.searchParams.delete('sslmode');
  url.searchParams.delete('sslrootcert');
  // Verify the cert against the pinned CA AND against its own declared identity.
  // The URL dials the box as `localhost`/an internal name that wouldn't match the
  // cert, so set `servername` to the name the pinned cert is actually issued for
  // (its SAN, else CN — the box's IP). The hostname check stays on and now passes
  // legitimately instead of being bypassed.
  const cert = new X509Certificate(ca);
  const san = cert.subjectAltName ?? '';
  const servername =
    san.match(/IP Address:([^,\s]+)/)?.[1] ??
    san.match(/DNS:([^,\s]+)/)?.[1] ??
    cert.subject.match(/CN=([^\n,]+)/)?.[1];
  const adapter = new PrismaPg({ connectionString: url.toString(), ssl: { ca, servername } });
  return new PrismaClient({ adapter });
}

const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
