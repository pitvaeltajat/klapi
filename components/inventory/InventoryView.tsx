'use client';

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type RowSelectionState,
} from '@tanstack/react-table';
import { useState, useCallback, useRef, useMemo } from 'react';
import { toast } from 'sonner';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CreatableSelect } from '@/components/ui/creatable-select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ChevronUp, ChevronDown, ChevronsUpDown, Trash2, ArrowUpCircle, Plus, Check, X } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { useItemImage } from '@/hooks/useItemImage';
import PromoteDialog from './PromoteDialog';

// Inline types so we don't depend on @prisma/client direct exports
export interface InventoryCategory {
  id: string;
  name: string;
  description: string | null;
}

export interface InventoryLocation {
  id: string;
  name: string;
  description: string | null;
}

export interface InventoryItem {
  id: string;
  name: string;
  description: string | null;
  amount: number;
  locationId: string | null;
  type: 'normal' | 'temporary';
  location: InventoryLocation | null;
  categories: InventoryCategory[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const TRUNCATE_LEN = 40;

function Truncated({ text }: { text: string | null | undefined }) {
  if (!text) return <span className="text-muted-foreground">—</span>;
  if (text.length <= TRUNCATE_LEN) return <span>{text}</span>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-default">{text.slice(0, TRUNCATE_LEN)}…</span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs whitespace-pre-wrap">{text}</TooltipContent>
    </Tooltip>
  );
}

function RowImage({ itemId, name }: { itemId: string; name: string }) {
  const src = useItemImage(itemId);
  return (
    // eslint-disable-next-line @next/next/no-img-element -- dynamic S3 URL with hook-based fallback
    <img
      src={src}
      alt={name}
      className="h-9 w-9 rounded border border-border object-cover"
      loading="lazy"
    />
  );
}

function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
  if (sorted === 'asc') return <ChevronUp className="ml-1 inline h-3 w-3" />;
  if (sorted === 'desc') return <ChevronDown className="ml-1 inline h-3 w-3" />;
  return <ChevronsUpDown className="ml-1 inline h-3 w-3 opacity-40" />;
}

type EditableField = 'name' | 'description' | 'amount';

interface CellEditState {
  rowId: string;
  field: EditableField;
  value: string;
}

const colHelper = createColumnHelper<InventoryItem>();

export default function InventoryView() {
  const { data: items = [], mutate: mutateItems, isLoading: itemsLoading } = useSWR<InventoryItem[]>(
    '/api/item/getInventory',
    fetcher,
  );
  const { data: categories = [] } = useSWR<InventoryCategory[]>(
    '/api/category/getCategories',
    fetcher,
  );
  const { data: locations = [] } = useSWR<InventoryLocation[]>(
    '/api/location/getLocations',
    fetcher,
  );

  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'normal' | 'temporary'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const [pendingRows, setPendingRows] = useState<Set<string>>(new Set());
  const [editState, setEditState] = useState<CellEditState | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkCategoryOpen, setBulkCategoryOpen] = useState(false);
  const [bulkCategoryValue, setBulkCategoryValue] = useState<{ value: string; label: string } | null>(null);

  const [promoteItem, setPromoteItem] = useState<InventoryItem | null>(null);
  const [promoteOpen, setPromoteOpen] = useState(false);

  const [addingRow, setAddingRow] = useState(false);
  const [addingSubmitting, setAddingSubmitting] = useState(false);
  const emptyDraft = { name: '', description: '', amount: 1 };
  const [newRow, setNewRow] = useState(emptyDraft);

  const cancelAddRow = () => {
    setAddingRow(false);
    setNewRow(emptyDraft);
  };

  const handleAddRow = async () => {
    if (!newRow.name.trim()) {
      toast.error('Nimi on pakollinen');
      return;
    }
    setAddingSubmitting(true);
    try {
      const res = await fetch('/api/item/createItem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRow.name.trim(),
          description: newRow.description.trim() || null,
          amount: newRow.amount,
          type: 'normal',
          categories: [],
        }),
      });
      if (!res.ok) {
        const data = await res.json() as { message?: string };
        throw new Error(data.message ?? 'Virhe');
      }
      await mutateItems();
      toast.success('Kama lisätty');
      setNewRow(emptyDraft);
      setAddingRow(false);
    } catch (err) {
      toast.error('Lisäys epäonnistui', {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setAddingSubmitting(false);
    }
  };

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        if (typeFilter !== 'all' && item.type !== typeFilter) return false;
        if (categoryFilter && !item.categories.some((c) => c.id === categoryFilter)) return false;
        return true;
      }),
    [items, typeFilter, categoryFilter],
  );

  const addPending = (id: string) => setPendingRows((prev) => new Set(prev).add(id));
  const removePending = (id: string) =>
    setPendingRows((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

  const updateItemLocal = useCallback(
    (updated: InventoryItem) => {
      mutateItems(
        (current) => current?.map((it) => (it.id === updated.id ? updated : it)) ?? [updated],
        false,
      );
    },
    [mutateItems],
  );

  const startEdit = useCallback((rowId: string, field: EditableField, currentValue: string) => {
    setEditState({ rowId, field, value: currentValue });
    setTimeout(() => editInputRef.current?.focus(), 0);
  }, []);

  const commitEdit = useCallback(async (state: CellEditState) => {
    setEditState(null);
    const { rowId, field, value } = state;

    const item = items.find((it) => it.id === rowId);
    if (!item) return;

    const fieldValues: Record<EditableField, string | number | null> = {
      name: item.name,
      description: item.description,
      amount: item.amount,
    };
    const originalValue = String(fieldValues[field] ?? '');
    if (value === originalValue) return;

    addPending(rowId);
    try {
      const res = await fetch('/api/item/patchItem', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rowId, field, value: field === 'amount' ? Number(value) : value }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error((data as { message?: string }).message ?? 'Virhe');
      }
      const updated = await res.json() as InventoryItem;
      updateItemLocal(updated);
      toast.success('Tallennettu');
    } catch (err) {
      toast.error('Tallennus epäonnistui', {
        description: err instanceof Error ? err.message : undefined,
      });
      mutateItems();
    } finally {
      removePending(rowId);
    }
  }, [items, mutateItems, updateItemLocal]);

  const handleDeleteRow = async (item: InventoryItem) => {
    addPending(item.id);
    setDeleteTarget(null);
    try {
      const res = await fetch('/api/item/deleteItem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.id),
      });
      if (!res.ok) throw new Error('Poisto epäonnistui');
      mutateItems((current) => current?.filter((it) => it.id !== item.id) ?? [], false);
      toast.success('Kama poistettu');
    } catch {
      toast.error('Poisto epäonnistui');
      mutateItems();
    } finally {
      removePending(item.id);
    }
  };

  const selectedIds = Object.keys(rowSelection).filter((k) => rowSelection[k]);

  const handleBulkDelete = async () => {
    setBulkDeleteOpen(false);
    const ids = selectedIds;
    ids.forEach(addPending);
    try {
      const res = await fetch('/api/item/bulkItems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', ids }),
      });
      if (!res.ok) throw new Error('Virhe');
      mutateItems((current) => current?.filter((it) => !ids.includes(it.id)) ?? [], false);
      setRowSelection({});
      toast.success(`${ids.length} kamaa poistettu`);
    } catch {
      toast.error('Massapoisto epäonnistui');
      mutateItems();
    } finally {
      ids.forEach(removePending);
    }
  };

  const handleBulkSetCategory = async () => {
    if (!bulkCategoryValue) return;
    setBulkCategoryOpen(false);
    const ids = selectedIds;
    ids.forEach(addPending);
    try {
      const res = await fetch('/api/item/bulkItems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setCategory', ids, categoryName: bulkCategoryValue.label }),
      });
      if (!res.ok) throw new Error('Virhe');
      mutateItems();
      setRowSelection({});
      setBulkCategoryValue(null);
      toast.success(`Kategoria asetettu ${ids.length} kamalle`);
    } catch {
      toast.error('Kategoria-asetus epäonnistui');
      mutateItems();
    } finally {
      ids.forEach(removePending);
    }
  };

  const columns = useMemo(() => [
    colHelper.display({
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
          className="cursor-pointer"
          aria-label="Valitse kaikki"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          className="cursor-pointer"
          aria-label="Valitse rivi"
        />
      ),
      size: 36,
    }),
    colHelper.display({
      id: 'image',
      header: '',
      cell: ({ row }) => <RowImage itemId={row.original.id} name={row.original.name} />,
      size: 52,
    }),
    colHelper.accessor((row) => row.name, {
      id: 'name',
      header: 'Nimi',
      cell: ({ row, getValue }) => {
        const id = row.original.id;
        const isEditing = editState?.rowId === id && editState.field === 'name';
        if (isEditing) {
          const es = editState;
          return (
            <input
              ref={editInputRef}
              className="w-full rounded border border-ring bg-background px-2 py-1 text-sm focus:outline-none"
              value={es.value}
              onChange={(e) => setEditState({ ...es, value: e.target.value })}
              onBlur={() => commitEdit(es)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitEdit(es);
                if (e.key === 'Escape') setEditState(null);
              }}
            />
          );
        }
        return (
          <span
            className="cursor-text hover:underline"
            onClick={() => startEdit(id, 'name', getValue())}
          >
            <Truncated text={getValue()} />
          </span>
        );
      },
    }),
    colHelper.accessor((row) => row.description, {
      id: 'description',
      header: 'Kuvaus',
      cell: ({ row, getValue }) => {
        const id = row.original.id;
        const val = getValue();
        const isEditing = editState?.rowId === id && editState.field === 'description';
        if (isEditing) {
          const es = editState;
          return (
            <input
              ref={editInputRef}
              className="w-full rounded border border-ring bg-background px-2 py-1 text-sm focus:outline-none"
              value={es.value}
              onChange={(e) => setEditState({ ...es, value: e.target.value })}
              onBlur={() => commitEdit(es)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitEdit(es);
                if (e.key === 'Escape') setEditState(null);
              }}
            />
          );
        }
        return (
          <span
            className="cursor-text hover:underline"
            onClick={() => startEdit(id, 'description', val ?? '')}
          >
            <Truncated text={val} />
          </span>
        );
      },
    }),
    colHelper.accessor((row) => row.amount, {
      id: 'amount',
      header: 'Määrä',
      cell: ({ row, getValue }) => {
        const id = row.original.id;
        const isEditing = editState?.rowId === id && editState.field === 'amount';
        if (isEditing) {
          const es = editState;
          return (
            <input
              ref={editInputRef}
              type="number"
              min={1}
              className="w-20 rounded border border-ring bg-background px-2 py-1 text-sm focus:outline-none"
              value={es.value}
              onChange={(e) => setEditState({ ...es, value: e.target.value })}
              onBlur={() => commitEdit(es)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitEdit(es);
                if (e.key === 'Escape') setEditState(null);
              }}
            />
          );
        }
        return (
          <span
            className="cursor-text hover:underline"
            onClick={() => startEdit(id, 'amount', String(getValue()))}
          >
            {getValue()}
          </span>
        );
      },
    }),
    colHelper.accessor((row) => row.type, {
      id: 'type',
      header: 'Tyyppi',
      cell: ({ getValue }) => {
        const type = getValue();
        return (
          <Badge variant={type === 'normal' ? 'default' : 'warning'}>
            {type === 'normal' ? 'Normaali' : 'Väliaikainen'}
          </Badge>
        );
      },
    }),
    colHelper.accessor((row) => row.location, {
      id: 'location',
      header: 'Sijainti',
      cell: ({ getValue }) => <Truncated text={getValue()?.name} />,
      sortingFn: (a, b) => {
        const an = a.original.location?.name ?? '';
        const bn = b.original.location?.name ?? '';
        return an.localeCompare(bn, 'fi');
      },
    }),
    colHelper.accessor((row) => row.categories, {
      id: 'categories',
      header: 'Kategoriat',
      cell: ({ getValue }) => {
        const cats = getValue();
        if (!cats.length) return <span className="text-muted-foreground">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {cats.map((c) => (
              <Badge key={c.id} variant="secondary">
                {c.name}
              </Badge>
            ))}
          </div>
        );
      },
      enableSorting: false,
    }),
    colHelper.display({
      id: 'actions',
      header: 'Toiminnot',
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex items-center gap-1">
            {item.type === 'temporary' && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-success hover:bg-success/10"
                    onClick={() => {
                      setPromoteItem(item);
                      setPromoteOpen(true);
                    }}
                    aria-label="Siirrä kirjastoon"
                  >
                    <ArrowUpCircle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Siirrä kirjastoon</TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteTarget(item)}
                  aria-label="Poista kama"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Poista</TooltipContent>
            </Tooltip>
          </div>
        );
      },
    }),
  ], [editState, startEdit, commitEdit]);

  const table = useReactTable({
    data: filteredItems,
    columns,
    state: { sorting, globalFilter, rowSelection },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 50 } },
    getRowId: (row) => row.id,
    globalFilterFn: (row, _colId, filterValue: string) => {
      const q = filterValue.toLowerCase();
      return (
        row.original.name.toLowerCase().includes(q) ||
        (row.original.description ?? '').toLowerCase().includes(q)
      );
    },
  });

  const categoryOptions = useMemo(
    () => categories.map((c) => ({ value: c.id, label: c.name })),
    [categories],
  );
  const categoryFilterOptions = useMemo(
    () => [{ value: '', label: 'Kaikki kategoriat' }, ...categoryOptions],
    [categoryOptions],
  );

  const { pageIndex, pageSize } = table.getState().pagination;
  const pageCount = table.getPageCount();

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-end">
          <span className="text-sm text-muted-foreground">
            {filteredItems.length} / {items.length} kamaa
          </span>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Hae nimellä tai kuvauksella…"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-64"
          />
          <div className="w-52">
            <CreatableSelect
              options={categoryFilterOptions}
              value={categoryFilterOptions.find((o) => o.value === categoryFilter) ?? null}
              onChange={(opt) => setCategoryFilter((opt as { value: string } | null)?.value ?? '')}
              placeholder="Kategoria"
              isClearable
            />
          </div>
          <div className="flex gap-1">
            {(['all', 'normal', 'temporary'] as const).map((t) => (
              <Button
                key={t}
                size="sm"
                variant={typeFilter === t ? 'default' : 'outline'}
                onClick={() => setTypeFilter(t)}
              >
                {t === 'all' ? 'Kaikki' : t === 'normal' ? 'Normaali' : 'Väliaikainen'}
              </Button>
            ))}
          </div>
          <Button
            size="sm"
            variant="success"
            className="ml-auto gap-2"
            onClick={() => setAddingRow(true)}
            disabled={addingRow}
          >
            <Plus className="h-4 w-4" /> Uusi rivi
          </Button>
        </div>

        {/* Bulk actions */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3 rounded-md border border-ring/30 bg-muted/40 px-4 py-2">
            <span className="text-sm font-medium">{selectedIds.length} valittu</span>
            <Button size="sm" variant="destructive" onClick={() => setBulkDeleteOpen(true)}>
              <Trash2 className="mr-1 h-3 w-3" /> Poista valitut
            </Button>
            <Button size="sm" variant="outline" onClick={() => setBulkCategoryOpen(true)}>
              Aseta kategoria
            </Button>
          </div>
        )}

        {/* Table */}
        <div className="rounded-lg border bg-card shadow-xs">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                      className={header.column.getCanSort() ? 'cursor-pointer select-none' : ''}
                      onClick={
                        header.column.getCanSort()
                          ? header.column.getToggleSortingHandler()
                          : undefined
                      }
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <SortIcon sorted={header.column.getIsSorted()} />
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {addingRow && (
                <TableRow className="bg-muted/30">
                  <TableCell />
                  <TableCell>
                    <div className="flex h-9 w-9 items-center justify-center rounded border border-dashed border-border text-muted-foreground">
                      <Plus className="h-4 w-4" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <input
                      autoFocus
                      placeholder="Nimi *"
                      value={newRow.name}
                      onChange={(e) => setNewRow((r) => ({ ...r, name: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddRow();
                        if (e.key === 'Escape') cancelAddRow();
                      }}
                      className="w-full rounded border border-ring bg-background px-2 py-1 text-sm focus:outline-none"
                    />
                  </TableCell>
                  <TableCell>
                    <input
                      placeholder="Kuvaus"
                      value={newRow.description}
                      onChange={(e) => setNewRow((r) => ({ ...r, description: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddRow();
                        if (e.key === 'Escape') cancelAddRow();
                      }}
                      className="w-full rounded border border-ring bg-background px-2 py-1 text-sm focus:outline-none"
                    />
                  </TableCell>
                  <TableCell>
                    <input
                      type="number"
                      min={1}
                      value={newRow.amount}
                      onChange={(e) =>
                        setNewRow((r) => ({ ...r, amount: Math.max(1, Number(e.target.value) || 1) }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddRow();
                        if (e.key === 'Escape') cancelAddRow();
                      }}
                      className="w-20 rounded border border-ring bg-background px-2 py-1 text-sm focus:outline-none"
                    />
                  </TableCell>
                  <TableCell>
                    <Badge>Normaali</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">—</TableCell>
                  <TableCell className="text-muted-foreground">—</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="success"
                        size="icon-sm"
                        onClick={handleAddRow}
                        isLoading={addingSubmitting}
                        aria-label="Tallenna"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={cancelAddRow}
                        disabled={addingSubmitting}
                        aria-label="Peruuta"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {itemsLoading && items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="py-8 text-center text-muted-foreground"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Spinner size="md" />
                      <span>Ladataan…</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="py-8 text-center text-muted-foreground"
                  >
                    Ei tuloksia
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className={
                      pendingRows.has(row.id) ? 'border-l-2 border-l-warning opacity-70' : ''
                    }
                    data-state={row.getIsSelected() ? 'selected' : undefined}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Sivu {pageIndex + 1} / {pageCount || 1}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Edellinen
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Seuraava
            </Button>
          </div>
          <span className="text-sm text-muted-foreground">
            {pageIndex * pageSize + 1}–
            {Math.min((pageIndex + 1) * pageSize, filteredItems.length)} / {filteredItems.length}
          </span>
        </div>
      </div>

      {/* Single delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Poista kama</DialogTitle>
          </DialogHeader>
          <p>
            Haluatko varmasti poistaa kaman{' '}
            <span className="font-bold">{deleteTarget?.name}</span>? Tätä ei voi perua.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Peruuta
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && handleDeleteRow(deleteTarget)}
            >
              Poista
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk delete confirm */}
      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Poista valitut kamat</DialogTitle>
          </DialogHeader>
          <p>
            Haluatko varmasti poistaa{' '}
            <span className="font-bold">{selectedIds.length}</span> kamaa? Tätä ei voi perua.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteOpen(false)}>
              Peruuta
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete}>
              Poista kaikki valitut
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk set category */}
      <Dialog open={bulkCategoryOpen} onOpenChange={setBulkCategoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aseta kategoria valituille kamoille</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Kategoria lisätään {selectedIds.length} valitulle kamalle. Voit myös luoda uuden
            kategorian kirjoittamalla sen nimen.
          </p>
          <CreatableSelect
            options={categoryOptions}
            value={bulkCategoryValue}
            onChange={(opt) =>
              setBulkCategoryValue(opt as { value: string; label: string } | null)
            }
            placeholder="Valitse tai luo kategoria"
            isClearable
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkCategoryOpen(false)}>
              Peruuta
            </Button>
            <Button onClick={handleBulkSetCategory} disabled={!bulkCategoryValue}>
              Aseta kategoria
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Promote dialog */}
      <PromoteDialog
        item={promoteItem}
        categories={categories}
        locations={locations}
        open={promoteOpen}
        onOpenChange={setPromoteOpen}
        onSuccess={(updated) => {
          updateItemLocal(updated as InventoryItem);
          setPromoteItem(null);
        }}
      />
    </>
  );
}
