import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { inventoryQuery } from '@/utils/itemQueries';
import {
  XLSX_MIME,
  buildInventoryWorkbook,
  inventoryFileName,
  toInventoryExportRows,
} from '@/utils/inventoryExport';
import { requireAdmin } from '@/utils/apiAuth';

/**
 * The kalusto as a spreadsheet: the inventory table's current view, every row
 * of it, as an .xlsx the admin can hand round or take stock from on paper.
 *
 * It reads the same query string as `item/getInventory` and runs it through the
 * same `inventoryQuery`, minus the paging — so "Vie Exceliin" gives exactly the
 * rows the table is showing, filters, search and sort order included, rather
 * than the fifty that happen to be on screen. The sheet itself is built in
 * `utils/inventoryExport.ts`.
 */

/**
 * A guard rail, not a page size: the `Item` table is unbounded (every loan with
 * an oma kama leaves a permanent temporary item behind), and the whole sheet is
 * built in memory on the machine that also runs the kiosk. Far above any real
 * kalusto; a truncated export says so in a response header.
 */
const MAX_ROWS = 20000;

export async function GET(request: Request) {
  const { denied } = await requireAdmin();
  if (denied) return denied;

  const params = new URL(request.url).searchParams;
  const { where, orderBy } = inventoryQuery(params);

  const items = await prisma.item.findMany({
    where,
    include: { categories: { select: { name: true } }, location: { select: { name: true } } },
    orderBy,
    take: MAX_ROWS,
  });

  const buffer = await buildInventoryWorkbook(toInventoryExportRows(items));

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': XLSX_MIME,
      'Content-Disposition': `attachment; filename="${inventoryFileName(new Date())}"`,
      'Content-Length': String(buffer.byteLength),
      // Nobody should be handed yesterday's stocktake out of a cache.
      'Cache-Control': 'no-store',
      ...(items.length === MAX_ROWS ? { 'X-Klapi-Truncated': String(MAX_ROWS) } : {}),
    },
  });
}
