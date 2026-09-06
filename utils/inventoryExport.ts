import writeXlsxFile, { type Column } from 'write-excel-file/node';
import type { Item } from '@prisma/client';

/**
 * The kalusto as a spreadsheet — the sheet behind `item/exportInventory`.
 *
 * Kept out of the route so the mapping (what a column says, how a kaman
 * kategoriat are joined, what "Tila" reads) is a pure function that can be
 * tested without a request, and the route is left with auth, the query and the
 * response headers.
 */

export const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const fiCollator = new Intl.Collator('fi');

/** What the exporter needs off an `Item` — a superset is fine. */
export type ExportableItem = Pick<
  Item,
  'id' | 'name' | 'description' | 'amount' | 'type' | 'deletedAt'
> & {
  location: { name: string } | null;
  categories: { name: string }[];
};

export interface InventoryExportRow {
  name: string;
  description: string | null;
  amount: number;
  location: string | null;
  /** Kategoriat as one cell, in Finnish alphabetical order. */
  categories: string;
  type: 'normal' | 'temporary';
  archivedAt: Date | null;
  id: string;
}

export function toInventoryExportRows(items: ExportableItem[]): InventoryExportRow[] {
  return items.map((item) => ({
    name: item.name,
    description: item.description,
    amount: item.amount,
    location: item.location?.name ?? null,
    categories: item.categories
      .map((c) => c.name)
      .sort(fiCollator.compare)
      .join(', '),
    type: item.type,
    archivedAt: item.deletedAt,
    id: item.id,
  }));
}

const headerStyle = { fontWeight: 'bold', backgroundColor: '#BBD1FB' } as const;

const columns: Column<InventoryExportRow>[] = [
  { header: { value: 'Nimi', ...headerStyle }, width: 32, cell: (r) => r.name },
  { header: { value: 'Kuvaus', ...headerStyle }, width: 48, cell: (r) => r.description ?? '' },
  {
    header: { value: 'Määrä', ...headerStyle },
    width: 8,
    cell: (r) => ({ value: r.amount, type: Number, align: 'right' }),
  },
  { header: { value: 'Sijainti', ...headerStyle }, width: 24, cell: (r) => r.location ?? '' },
  { header: { value: 'Kategoriat', ...headerStyle }, width: 32, cell: (r) => r.categories },
  {
    header: { value: 'Tyyppi', ...headerStyle },
    width: 14,
    cell: (r) => (r.type === 'temporary' ? 'Väliaikainen' : 'Normaali'),
  },
  {
    header: { value: 'Tila', ...headerStyle },
    width: 14,
    cell: (r) => (r.archivedAt ? 'Arkistoitu' : 'Aktiivinen'),
  },
  {
    header: { value: 'Arkistoitu', ...headerStyle },
    width: 14,
    // Blank rather than "—" for a live kama: this column is a date, and an
    // empty cell is what a spreadsheet reads as "no date".
    cell: (r) => (r.archivedAt ? { value: r.archivedAt, type: Date, format: 'dd.mm.yyyy' } : ''),
  },
  // Last, because it is for scripts rather than for reading: a kaman nimi is
  // free text and not unique, so anything matching rows back to Klapi keys on
  // the id.
  { header: { value: 'ID', ...headerStyle }, width: 28, cell: (r) => r.id },
];

export function buildInventoryWorkbook(rows: InventoryExportRow[]): Promise<Buffer> {
  return writeXlsxFile(rows, {
    columns,
    sheet: 'Kalusto',
    // The header row stays put while you scroll a few hundred kamaa.
    stickyRowsCount: 1,
  }).toBuffer();
}

/** `kalusto-2026-09-06.xlsx` — sorts by date in a downloads folder. */
export function inventoryFileName(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `kalusto-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.xlsx`;
}
