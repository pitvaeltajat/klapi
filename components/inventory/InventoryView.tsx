'use client';

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type RowSelectionState,
  type PaginationState,
} from '@tanstack/react-table';
import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
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
import { ChevronUp, ChevronDown, ChevronsUpDown, Trash2, ArrowUpCircle, Plus, Check, X, RotateCcw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useItemImage } from '@/hooks/useItemImage';
import { cn } from '@/lib/utils';
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
  deletedAt: string | null;
  location: InventoryLocation | null;
  categories: InventoryCategory[];
}

export interface InventoryListResponse {
  items: InventoryItem[];
  total: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const TRUNCATE_LEN = 40;

// Resting state of an inline-editable cell. It reads as plain text until hovered,
// then reveals a text-field outline (matching the editing input's box model) so it
// is obvious the value is click-to-edit, with no layout jump once editing starts.
const EDITABLE_DISPLAY_CLASS =
  'cursor-text rounded border border-transparent px-2 py-1 transition-colors hover:border-input hover:bg-background';
// Box model shared by the resting display and the active input so they line up.
const EDITABLE_INPUT_CLASS =
  'rounded border border-ring bg-background px-2 py-1 text-sm focus:outline-none';

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
  // Filtering, sorting, and pagination all happen server-side: the Item table
  // is unbounded (every custom loan leaves a permanent temporary item behind),
  // so the editor only ever fetches and renders a single page of rows.
  const [showArchived, setShowArchived] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'name', desc: false }]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 });
  const [typeFilter, setTypeFilter] = useState<'all' | 'normal' | 'temporary'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const toFirstPage = useCallback(
    () => setPagination((p) => (p.pageIndex === 0 ? p : { ...p, pageIndex: 0 })),
    [],
  );

  // Debounce the search box so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      toFirstPage();
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput, toFirstPage]);

  const sortId = sorting[0]?.id ?? 'name';
  const sortDir = sorting[0]?.desc ? 'desc' : 'asc';
  const inventoryUrl = useMemo(() => {
    const q = new URLSearchParams({
      page: String(pagination.pageIndex + 1),
      pageSize: String(pagination.pageSize),
      sort: sortId,
      dir: sortDir,
    });
    if (search) q.set('search', search);
    if (typeFilter !== 'all') q.set('type', typeFilter);
    if (categoryFilter) q.set('category', categoryFilter);
    if (showArchived) q.set('archived', 'all');
    return `/api/item/getInventory?${q.toString()}`;
  }, [pagination, sortId, sortDir, search, typeFilter, categoryFilter, showArchived]);

  const { data, mutate: mutateItems, isLoading: itemsLoading } =
    useSWR<InventoryListResponse>(inventoryUrl, fetcher, { keepPreviousData: true });
  const items = useMemo(() => data?.items ?? [], [data]);
  const total = data?.total ?? 0;

  const { data: categories = [] } = useSWR<InventoryCategory[]>(
    '/api/category/getCategories',
    fetcher,
  );
  const { data: locations = [] } = useSWR<InventoryLocation[]>(
    '/api/location/getLocations',
    fetcher,
  );

  const [pendingRows, setPendingRows] = useState<Set<string>>(new Set());
  const [editState, setEditState] = useState<CellEditState | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkCategoryOpen, setBulkCategoryOpen] = useState(false);
  const [bulkCategoryValue, setBulkCategoryValue] = useState<{ value: string; label: string } | null>(null);
  const [bulkLocationOpen, setBulkLocationOpen] = useState(false);
  const [bulkLocationValue, setBulkLocationValue] = useState<{ value: string; label: string } | null>(null);

  const [promoteItem, setPromoteItem] = useState<InventoryItem | null>(null);

  const [addingRow, setAddingRow] = useState(false);
  const [addingSubmitting, setAddingSubmitting] = useState(false);
  const emptyDraft = { name: '', description: '', amount: 1 };
  const [newRow, setNewRow] = useState(emptyDraft);
  const [newRowImage, setNewRowImage] = useState<File | null>(null);
  const [newRowPreview, setNewRowPreview] = useState<string | null>(null);
  const newRowFileInputRef = useRef<HTMLInputElement>(null);

  const handleNewRowImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setNewRowImage(file);
    setNewRowPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  };

  const cancelAddRow = () => {
    setAddingRow(false);
    setNewRow(emptyDraft);
    setNewRowImage(null);
    setNewRowPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (newRowFileInputRef.current) newRowFileInputRef.current.value = '';
  };

  const uploadNewRowImage = async (itemId: string, file: File) => {
    const presignRes = await fetch('/api/item/uploadImage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: itemId, contentType: file.type }),
    });
    if (!presignRes.ok) throw new Error('Kuvan lataus epäonnistui');
    const { url, fields } = (await presignRes.json()) as {
      url: string;
      fields: Record<string, string>;
    };
    const formData = new FormData();
    Object.entries(fields).forEach(([k, v]) => formData.append(k, v));
    formData.append('file', file);
    const uploadRes = await fetch(url, { method: 'POST', body: formData });
    if (!uploadRes.ok) throw new Error('Kuvan tallennus epäonnistui');
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
      const created = (await res.json()) as { id: string };
      if (newRowImage) {
        try {
          await uploadNewRowImage(created.id, newRowImage);
        } catch (uploadErr) {
          toast.error('Kama lisätty, mutta kuvan lataus epäonnistui', {
            description: uploadErr instanceof Error ? uploadErr.message : undefined,
          });
        }
      }
      await mutateItems();
      toast.success('Kama lisätty');
      setNewRow(emptyDraft);
      setNewRowImage(null);
      setNewRowPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      if (newRowFileInputRef.current) newRowFileInputRef.current.value = '';
      setAddingRow(false);
    } catch (err) {
      toast.error('Lisäys epäonnistui', {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setAddingSubmitting(false);
    }
  };

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
        (current) =>
          current
            ? {
                ...current,
                items: current.items.map((it) => (it.id === updated.id ? updated : it)),
              }
            : current,
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
      if (!res.ok) throw new Error('Arkistointi epäonnistui');
      toast.success('Kama arkistoitu');
    } catch {
      toast.error('Arkistointi epäonnistui');
    } finally {
      removePending(item.id);
      // Revalidate the current page so the archived row leaves (or stays muted
      // when the archive toggle is on) and the page backfills from the server.
      mutateItems();
    }
  };

  const handleRestoreRow = useCallback(async (item: InventoryItem) => {
    addPending(item.id);
    try {
      const res = await fetch('/api/item/restoreItem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.id),
      });
      if (!res.ok) throw new Error('Palautus epäonnistui');
      toast.success('Kama palautettu');
    } catch {
      toast.error('Palautus epäonnistui');
    } finally {
      removePending(item.id);
      mutateItems();
    }
  }, [mutateItems]);

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
      setRowSelection({});
      toast.success(`${ids.length} kamaa arkistoitu`);
    } catch {
      toast.error('Massapoisto epäonnistui');
    } finally {
      ids.forEach(removePending);
      mutateItems();
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

  const handleBulkSetLocation = async () => {
    if (!bulkLocationValue) return;
    setBulkLocationOpen(false);
    const ids = selectedIds;
    ids.forEach(addPending);
    try {
      const res = await fetch('/api/item/bulkItems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setLocation', ids, locationName: bulkLocationValue.label }),
      });
      if (!res.ok) throw new Error('Virhe');
      mutateItems();
      setRowSelection({});
      setBulkLocationValue(null);
      toast.success(`Sijainti asetettu ${ids.length} kamalle`);
    } catch {
      toast.error('Sijainnin asetus epäonnistui');
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
              className={cn(EDITABLE_INPUT_CLASS, 'block w-full')}
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
            className={cn(EDITABLE_DISPLAY_CLASS, 'block w-full')}
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
              className={cn(EDITABLE_INPUT_CLASS, 'block w-full')}
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
            className={cn(EDITABLE_DISPLAY_CLASS, 'block w-full')}
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
              className={cn(EDITABLE_INPUT_CLASS, 'w-20')}
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
            className={cn(EDITABLE_DISPLAY_CLASS, 'inline-block w-20')}
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
        const isArchived = !!item.deletedAt;
        return (
          <div className="flex items-center gap-1">
            {item.type === 'temporary' && !isArchived && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-success hover:bg-success/10"
                    onClick={() => {
                      setPromoteItem(item);
                    }}
                    aria-label="Siirrä kirjastoon"
                  >
                    <ArrowUpCircle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Siirrä kirjastoon</TooltipContent>
              </Tooltip>
            )}
            {isArchived ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-success hover:bg-success/10"
                    onClick={() => handleRestoreRow(item)}
                    aria-label="Palauta kama"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Palauta</TooltipContent>
              </Tooltip>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteTarget(item)}
                    aria-label="Arkistoi kama"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Arkistoi</TooltipContent>
              </Tooltip>
            )}
          </div>
        );
      },
    }),
  ], [editState, startEdit, commitEdit, handleRestoreRow]);

  const pageCount = Math.max(1, Math.ceil(total / pagination.pageSize));

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table v8 returns non-memoizable functions; safe under React Compiler skip
  const table = useReactTable({
    data: items,
    columns,
    state: { sorting, rowSelection, pagination },
    // Server does the filtering/sorting/paging; the table just renders one page.
    manualSorting: true,
    manualFiltering: true,
    manualPagination: true,
    pageCount,
    rowCount: total,
    onSortingChange: (updater) => {
      setSorting(updater);
      toFirstPage();
    },
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  const categoryOptions = useMemo(
    () => categories.map((c) => ({ value: c.id, label: c.name })),
    [categories],
  );
  const categoryFilterOptions = useMemo(
    () => [{ value: '', label: 'Kaikki kategoriat' }, ...categoryOptions],
    [categoryOptions],
  );
  const locationOptions = useMemo(
    () => locations.map((l) => ({ value: l.id, label: l.name })),
    [locations],
  );

  const { pageIndex, pageSize } = pagination;

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-end">
          <span className="text-sm text-muted-foreground">
            {total} kamaa
          </span>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Hae nimellä tai kuvauksella…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-64"
          />
          <div className="w-52">
            <CreatableSelect
              options={categoryFilterOptions}
              value={categoryFilterOptions.find((o) => o.value === categoryFilter) ?? null}
              onChange={(opt) => {
                setCategoryFilter((opt as { value: string } | null)?.value ?? '');
                toFirstPage();
              }}
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
                onClick={() => {
                  setTypeFilter(t);
                  toFirstPage();
                }}
              >
                {t === 'all' ? 'Kaikki' : t === 'normal' ? 'Normaali' : 'Väliaikainen'}
              </Button>
            ))}
          </div>
          <Button
            size="sm"
            variant={showArchived ? 'default' : 'outline'}
            onClick={() => {
              setShowArchived((v) => !v);
              toFirstPage();
            }}
          >
            Näytä arkistoidut
          </Button>
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
              <Trash2 className="mr-1 h-3 w-3" /> Arkistoi valitut
            </Button>
            <Button size="sm" variant="outline" onClick={() => setBulkCategoryOpen(true)}>
              Aseta kategoria
            </Button>
            <Button size="sm" variant="outline" onClick={() => setBulkLocationOpen(true)}>
              Aseta sijainti
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
                    <input
                      ref={newRowFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleNewRowImageChange}
                    />
                    <button
                      type="button"
                      onClick={() => newRowFileInputRef.current?.click()}
                      className="flex h-9 w-9 cursor-pointer items-center justify-center overflow-hidden rounded border border-dashed border-border text-muted-foreground hover:border-ring hover:text-foreground"
                      aria-label={newRowImage ? 'Vaihda kuva' : 'Lisää kuva'}
                      title={newRowImage ? 'Vaihda kuva' : 'Lisää kuva'}
                      disabled={addingSubmitting}
                    >
                      {newRowPreview ? (
                        // eslint-disable-next-line @next/next/no-img-element -- local preview from FileReader URL
                        <img
                          src={newRowPreview}
                          alt="Esikatselu"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                    </button>
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
                Array.from({ length: 8 }).map((_, rowIdx) => (
                  <TableRow key={`skeleton-${rowIdx}`}>
                    {columns.map((_col, colIdx) => (
                      <TableCell key={colIdx} className="py-3">
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
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
                table.getRowModel().rows.map((row) => {
                  const isArchived = !!row.original.deletedAt;
                  const classes = [
                    pendingRows.has(row.id) ? 'border-l-2 border-l-warning opacity-70' : '',
                    isArchived ? 'opacity-50 italic' : '',
                  ]
                    .filter(Boolean)
                    .join(' ');
                  return (
                  <TableRow
                    key={row.id}
                    className={classes}
                    data-state={row.getIsSelected() ? 'selected' : undefined}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Sivu {pageIndex + 1} / {pageCount}
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
            {total === 0 ? 0 : pageIndex * pageSize + 1}–
            {Math.min((pageIndex + 1) * pageSize, total)} / {total}
          </span>
        </div>
      </div>

      {/* Single archive confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Arkistoi kama</DialogTitle>
          </DialogHeader>
          <p>
            Haluatko varmasti arkistoida kaman{' '}
            <span className="font-bold">{deleteTarget?.name}</span>? Lainahistoria säilyy ja
            voit palauttaa kaman myöhemmin.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Peruuta
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && handleDeleteRow(deleteTarget)}
            >
              Arkistoi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk archive confirm */}
      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Arkistoi valitut kamat</DialogTitle>
          </DialogHeader>
          <p>
            Haluatko varmasti arkistoida{' '}
            <span className="font-bold">{selectedIds.length}</span> kamaa? Lainahistoria säilyy
            ja voit palauttaa kamat myöhemmin.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteOpen(false)}>
              Peruuta
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete}>
              Arkistoi valitut
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

      {/* Bulk set location */}
      <Dialog open={bulkLocationOpen} onOpenChange={setBulkLocationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aseta sijainti valituille kamoille</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Sijainti vaihdetaan {selectedIds.length} valitulle kamalle. Voit myös luoda uuden
            sijainnin kirjoittamalla sen nimen.
          </p>
          <CreatableSelect
            options={locationOptions}
            value={bulkLocationValue}
            onChange={(opt) =>
              setBulkLocationValue(opt as { value: string; label: string } | null)
            }
            placeholder="Valitse tai luo sijainti"
            isClearable
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkLocationOpen(false)}>
              Peruuta
            </Button>
            <Button onClick={handleBulkSetLocation} disabled={!bulkLocationValue}>
              Aseta sijainti
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Promote dialog */}
      {promoteItem && (
        <PromoteDialog
          key={promoteItem.id}
          item={promoteItem}
          categories={categories}
          locations={locations}
          onOpenChange={(open) => {
            if (!open) setPromoteItem(null);
          }}
          onSuccess={(updated) => {
            updateItemLocal(updated as InventoryItem);
            setPromoteItem(null);
          }}
        />
      )}
    </>
  );
}
