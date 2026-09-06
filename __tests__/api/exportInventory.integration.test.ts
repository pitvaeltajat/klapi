/**
 * Integration tests for `GET /api/item/exportInventory` — the kalusto as an
 * .xlsx. The real route handler runs with the admin guard stubbed out.
 *
 * The workbook is unzipped and its XML read, so these tests fail on a file
 * Excel would refuse rather than only on one that isn't produced at all.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { inflateRawSync } from 'node:zlib';
import { PrismaClient, Group } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { toInventoryExportRows, inventoryFileName } from '@/utils/inventoryExport';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const prefix = `export-test-${Date.now()}`;

let adminId: string;
let categoryId: string;
let locationId: string;

const guard: { admin: boolean } = { admin: true };

vi.mock('@/utils/apiAuth', () => ({
  requireAdmin: async () =>
    guard.admin
      ? { session: { user: { id: adminId, group: Group.ADMIN } }, denied: null }
      : { session: null, denied: new Response(null, { status: 401 }) },
}));

const { GET } = await import('@/app/api/item/exportInventory/route');

const exportInventory = (query = '') =>
  GET(new Request(`http://localhost/api/item/exportInventory?${query}`));

/**
 * Reads a ZIP's entries through its central directory. The local headers of a
 * streamed archive leave their sizes to a trailing data descriptor, so the
 * directory at the end of the file is the only place they can be read from.
 */
function unzip(buffer: Buffer): Map<string, string> {
  const EOCD_SIGNATURE = 0x06054b50;
  let eocd = buffer.length - 22;
  while (eocd >= 0 && buffer.readUInt32LE(eocd) !== EOCD_SIGNATURE) eocd--;
  expect(eocd, 'file ends in a zip central directory').toBeGreaterThanOrEqual(0);

  const entryCount = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);

  const entries = new Map<string, string>();
  for (let i = 0; i < entryCount; i++) {
    expect(buffer.readUInt32LE(offset)).toBe(0x02014b50);
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.subarray(offset + 46, offset + 46 + nameLength).toString('utf8');

    // Step over the local header to the data: its own name/extra lengths need
    // not match the ones in the directory entry.
    const dataStart =
      localOffset +
      30 +
      buffer.readUInt16LE(localOffset + 26) +
      buffer.readUInt16LE(localOffset + 28);
    const data = buffer.subarray(dataStart, dataStart + compressedSize);
    entries.set(name, (method === 0 ? data : inflateRawSync(data)).toString('utf8'));

    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

/** Every string in the workbook, in the order Excel stored them. */
async function sharedStrings(response: Response): Promise<string[]> {
  const files = unzip(Buffer.from(await response.arrayBuffer()));
  const xml = files.get('xl/sharedStrings.xml');
  expect(xml, 'workbook has a shared string table').toBeDefined();
  return [...xml!.matchAll(/<t(?:[^>]*)>([\s\S]*?)<\/t>/g)].map((m) =>
    m[1].replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>'),
  );
}

describe('exportInventory', () => {
  beforeAll(async () => {
    const admin = await prisma.user.create({
      data: { id: `${prefix}-admin`, email: `${prefix}-admin@test.com`, group: Group.ADMIN },
    });
    adminId = admin.id;
    const category = await prisma.category.create({
      data: { id: `${prefix}-cat`, name: `${prefix} Örkit` },
    });
    categoryId = category.id;
    const location = await prisma.location.create({
      data: { id: `${prefix}-loc`, name: `${prefix} Kellari` },
    });
    locationId = location.id;

    await prisma.item.create({
      data: {
        id: `${prefix}-normal`,
        name: `${prefix} Teltta`,
        description: 'Kolmen hengen',
        amount: 4,
        locationId,
        categories: { connect: { id: categoryId } },
      },
    });
    await prisma.item.create({
      data: {
        id: `${prefix}-temp`,
        name: `${prefix} Oma makuupussi`,
        amount: 1,
        type: 'temporary',
      },
    });
    await prisma.item.create({
      data: {
        id: `${prefix}-archived`,
        name: `${prefix} Rikkinäinen retkikeitin`,
        amount: 2,
        deletedAt: new Date('2026-03-04T10:00:00Z'),
      },
    });
  });

  afterAll(async () => {
    await prisma.item.deleteMany({ where: { id: { startsWith: prefix } } });
    await prisma.category.deleteMany({ where: { id: categoryId } });
    await prisma.location.deleteMany({ where: { id: locationId } });
    await prisma.user.deleteMany({ where: { id: adminId } });
    await prisma.$disconnect();
  });

  it('answers with a downloadable xlsx', async () => {
    const response = await exportInventory();
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(response.headers.get('Content-Disposition')).toMatch(
      /^attachment; filename="kalusto-\d{4}-\d{2}-\d{2}\.xlsx"$/,
    );
    expect(response.headers.get('Cache-Control')).toBe('no-store');

    const buffer = Buffer.from(await response.arrayBuffer());
    // "PK\x03\x04" — a real zip container, which is what an .xlsx is.
    expect(buffer.subarray(0, 4).toString('binary')).toBe('PK');
    expect(Number(response.headers.get('Content-Length'))).toBe(buffer.byteLength);
  });

  it('writes one sheet with the Finnish column headers', async () => {
    const files = unzip(Buffer.from(await (await exportInventory()).arrayBuffer()));
    expect([...files.keys()]).toEqual(
      expect.arrayContaining(['xl/workbook.xml', 'xl/worksheets/sheet1.xml']),
    );
    expect(files.get('xl/workbook.xml')).toContain('Kalusto');

    const strings = await sharedStrings(await exportInventory());
    expect(strings.slice(0, 9)).toEqual([
      'Nimi',
      'Kuvaus',
      'Määrä',
      'Sijainti',
      'Kategoriat',
      'Tyyppi',
      'Tila',
      'Arkistoitu',
      'ID',
    ]);
  });

  it('carries the kaman tiedot, ääkköset and all', async () => {
    const strings = await sharedStrings(await exportInventory());
    expect(strings).toContain(`${prefix} Teltta`);
    expect(strings).toContain('Kolmen hengen');
    expect(strings).toContain(`${prefix} Kellari`);
    expect(strings).toContain(`${prefix} Örkit`);
    expect(strings).toContain('Väliaikainen');
  });

  it('follows the table filters rather than exporting everything', async () => {
    const onlyTemporary = await sharedStrings(await exportInventory('type=temporary'));
    expect(onlyTemporary).toContain(`${prefix} Oma makuupussi`);
    expect(onlyTemporary).not.toContain(`${prefix} Teltta`);

    const searched = await sharedStrings(await exportInventory('search=Teltta'));
    expect(searched).toContain(`${prefix} Teltta`);
    expect(searched).not.toContain(`${prefix} Oma makuupussi`);
  });

  it('leaves archived kamat out unless the table is showing them', async () => {
    const live = await sharedStrings(await exportInventory());
    expect(live).not.toContain(`${prefix} Rikkinäinen retkikeitin`);
    expect(live).not.toContain('Arkistoitu ');

    const withArchived = await sharedStrings(await exportInventory('archived=all'));
    expect(withArchived).toContain(`${prefix} Rikkinäinen retkikeitin`);
    expect(withArchived).toContain('Arkistoitu');
  });

  it('is admin-only', async () => {
    guard.admin = false;
    try {
      expect((await exportInventory()).status).toBe(401);
    } finally {
      guard.admin = true;
    }
  });
});

describe('inventory export rows', () => {
  const base = {
    id: 'i1',
    name: 'Teltta',
    description: null,
    amount: 1,
    type: 'normal' as const,
    deletedAt: null,
    location: null,
    categories: [],
  };

  it('joins the kategoriat in Finnish alphabetical order', () => {
    const [row] = toInventoryExportRows([
      {
        ...base,
        // ä sorts last in Finnish, not next to a.
        categories: [{ name: 'Ähkyt' }, { name: 'Ateriointi' }, { name: 'Öljyt' }],
      },
    ]);
    expect(row.categories).toBe('Ateriointi, Ähkyt, Öljyt');
  });

  it('keeps an empty sijainti and kuvaus empty rather than inventing a dash', () => {
    const [row] = toInventoryExportRows([base]);
    expect(row.location).toBeNull();
    expect(row.description).toBeNull();
  });

  it('names the file after the day it was taken', () => {
    expect(inventoryFileName(new Date(2026, 8, 6))).toBe('kalusto-2026-09-06.xlsx');
  });
});
