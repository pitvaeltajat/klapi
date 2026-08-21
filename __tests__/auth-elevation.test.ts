import { describe, it, expect, beforeAll, vi } from 'vitest';
import bcrypt from 'bcrypt';

// Mock the Prisma singleton so these tests need no database. verifyElevationPin
// looks users up by id via findUnique; we resolve from an in-memory table.
vi.mock('@/utils/prisma', () => ({
  default: { user: { findUnique: vi.fn(), findMany: vi.fn() } },
}));

import prisma from '@/utils/prisma';
import { authConfig } from '@/lib/auth';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const jwt = authConfig.callbacks!.jwt as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sessionCb = authConfig.callbacks!.session as any;

// All values below are fictional test fixtures. Two admins deliberately SHARE a
// PIN to prove that elevation is name-scoped: a shared PIN must still elevate as
// whoever was named, never the other admin. Plus a kiosk user (the base session)
// and a plain user (must never be able to elevate).
const SHARED_PIN = '4406';
let users: Record<string, { id: string; name: string | null; group: string; kioskElevatePin: string | null }>;

beforeAll(async () => {
  const sharedHash = await bcrypt.hash(SHARED_PIN, 10);
  users = {
    'admin-1': { id: 'admin-1', name: 'Admin One', group: 'ADMIN', kioskElevatePin: sharedHash },
    'admin-2': { id: 'admin-2', name: 'Admin Two', group: 'ADMIN', kioskElevatePin: sharedHash },
    'kiosk-1': { id: 'kiosk-1', name: 'Kiosk Terminal', group: 'KIOSK', kioskElevatePin: null },
    'user-1': { id: 'user-1', name: 'Regular User', group: 'USER', kioskElevatePin: null },
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (prisma.user.findUnique as any).mockImplementation(async ({ where }: { where: { id: string } }) =>
    users[where.id] ?? null,
  );
});

const future = (ms: number) => new Date(Date.now() + ms).toISOString();
const past = (ms: number) => new Date(Date.now() - ms).toISOString();

describe('jwt callback — kiosk elevation is server-authoritative', () => {
  it('IGNORES a client that self-asserts group/elevatedById (the original vuln)', async () => {
    const token = { group: 'KIOSK', userId: 'kiosk-1' };
    const out = await jwt({
      token,
      trigger: 'update',
      // No action — just a forged privilege claim, exactly what used to work.
      session: { user: { group: 'ADMIN', elevatedById: 'admin-1', elevatedByName: 'Admin One', adminExpiry: future(30 * 60_000) } },
    });
    expect(out.group).toBe('KIOSK');
    expect(out.elevatedById ?? null).toBeNull();
  });

  it('elevates with the correct PIN for the NAMED admin', async () => {
    const out = await jwt({
      token: { group: 'KIOSK', userId: 'kiosk-1' },
      trigger: 'update',
      session: { action: 'elevate', adminId: 'admin-2', pin: SHARED_PIN },
    });
    expect(out.group).toBe('ADMIN');
    expect(out.elevatedById).toBe('admin-2');
    expect(out.elevatedByName).toBe('Admin Two');
    expect(typeof out.adminExpiry).toBe('string');
  });

  it('with a SHARED PIN, elevates as whoever was named — never the other admin', async () => {
    const out = await jwt({
      token: { group: 'KIOSK', userId: 'kiosk-1' },
      trigger: 'update',
      session: { action: 'elevate', adminId: 'admin-2', pin: SHARED_PIN },
    });
    expect(out.elevatedById).toBe('admin-2');
    expect(out.elevatedById).not.toBe('admin-1');
  });

  it('rejects a wrong PIN (stays KIOSK)', async () => {
    const out = await jwt({
      token: { group: 'KIOSK', userId: 'kiosk-1' },
      trigger: 'update',
      session: { action: 'elevate', adminId: 'admin-1', pin: '0000' },
    });
    expect(out.group).toBe('KIOSK');
    expect(out.elevatedById ?? null).toBeNull();
  });

  it('refuses to elevate a non-KIOSK base session', async () => {
    const out = await jwt({
      token: { group: 'USER', userId: 'user-1' },
      trigger: 'update',
      session: { action: 'elevate', adminId: 'admin-1', pin: SHARED_PIN },
    });
    expect(out.group).toBe('USER');
    expect(out.elevatedById ?? null).toBeNull();
  });

  it('deElevate returns an elevated token to KIOSK', async () => {
    const out = await jwt({
      token: { group: 'ADMIN', userId: 'kiosk-1', elevatedById: 'admin-2', elevatedByName: 'Admin Two', adminExpiry: future(30 * 60_000) },
      trigger: 'update',
      session: { action: 'deElevate' },
    });
    expect(out.group).toBe('KIOSK');
    expect(out.elevatedById ?? null).toBeNull();
  });
});

describe('session callback — expiry is enforced server-side', () => {
  const build = async (adminExpiry: string | null) =>
    sessionCb({
      session: { user: {} },
      token: { group: 'ADMIN', userId: 'kiosk-1', elevatedById: 'admin-2', elevatedByName: 'Admin Two', adminExpiry },
    });

  it('presents a LAPSED elevation as plain KIOSK', async () => {
    const s = await build(past(60_000));
    expect(s.user.group).toBe('KIOSK');
    expect(s.user.elevatedById).toBeNull();
    expect(s.user.adminExpiry).toBeNull();
  });

  it('rejects an implausibly far-future (forged) expiry', async () => {
    const s = await build(future(2 * 60 * 60_000));
    expect(s.user.group).toBe('KIOSK');
    expect(s.user.elevatedById).toBeNull();
  });

  it('passes a valid, in-window elevation through', async () => {
    const s = await build(future(20 * 60_000));
    expect(s.user.group).toBe('ADMIN');
    expect(s.user.elevatedById).toBe('admin-2');
  });
});
