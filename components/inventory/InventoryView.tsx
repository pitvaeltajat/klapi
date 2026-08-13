'use client';

import {
  useTable,
  tableFeatures,
  columnSizingFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  flexRender,
  createColumnHelper,
  type CellContext,
  type SortingState,
  type RowSelectionState,
  type PaginationState,
} from '@tanstack/react-table';
import { createContext, useContext, useState, useCallback, useRef, useMemo, useEffect, type RefObject } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { FilterChip } from '@/components/ui/filter-chip';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ChevronUp, ChevronDown, ChevronsUpDown, Trash2, ArrowUpCircle, Pencil, RotateCcw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useItemImage } from '@/hooks/useItemImage';
import { cn } from '@/lib/utils';
import PromoteDialog from './PromoteDialog';
import EditItemDialog from '@/components/EditItemDialog';

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

// The editable cells subscribe to this context so the cell component identity
// can stay stable across renders. TanStack's `flexRender` invokes `cell` as
// `<Comp {...ctx} />`, so a fresh inline `cell: ({...}) => …` per render is a
// new component type and React unmounts the active <input> on every keystroke
// (losing focus). Keep the cell components defined once at module scope and
// pipe the edit state in through context instead.
interface EditCellContextValue {
  editState: CellEditState | null;
  setEditState: (s: CellEditState | null) => void;
  startEdit: (rowId: string, field: EditableField, currentValue: string) => void;
  // commitEdit closes the editor and persists. scheduleAutoSave debounces a
  // background save while the editor stays open, so changes land ~1s after
  // typing pauses without forcing the user to press Enter or click away.
  commitEdit: (state: CellEditState) => void;
  scheduleAutoSave: (state: CellEditState) => void;
  editInputRef: RefObject<HTMLInputElement | null>;
}
const EditCellContext = createContext<EditCellContextValue | null>(null);
function useEditCell() {
  const ctx = useContext(EditCellContext);
  if (!ctx) throw new Error('EditCellContext provider missing');
  return ctx;
}

interface EditableCellConfig<T> {
  field: EditableField;
  /** Extra classes on the active input and on the resting display. */
  inputClassName: string;
  displayClassName: string;
  /** Static attributes for the input (`type`, `min`, …). */
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
  /** Cell value -> the string the editor starts from. */
  toEditValue: (value: T) => string;
  renderDisplay: (value: T) => React.ReactNode;
}

/**
 * Builds one click-to-edit cell. Call this at module scope only — see the
 * EditCellContext note above: a component identity created during render makes
 * TanStack remount the active <input> on every keystroke.
 */
function makeEditableCell<T>({
  field,
  inputClassName,
  displayClassName,
  inputProps,
  toEditValue,
  renderDisplay,
}: EditableCellConfig<T>) {
  return function EditableCell({ row, getValue }: CellContext<typeof features, InventoryItem, T>) {
    const { editState, setEditState, startEdit, commitEdit, scheduleAutoSave, editInputRef } =
      useEditCell();
    const id = row.original.id;
    const value = getValue();

    if (editState?.rowId === id && editState.field === field) {
      const es = editState;
      return (
        <input
          {...inputProps}
          ref={editInputRef}
          className={cn(EDITABLE_INPUT_CLASS, inputClassName)}
          value={es.value}
          onChange={(e) => {
            const next = { ...es, value: e.target.value };
            setEditState(next);
            scheduleAutoSave(next);
          }}
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
        className={cn(EDITABLE_DISPLAY_CLASS, displayClassName)}
        onClick={() => startEdit(id, field, toEditValue(value))}
      >
        {renderDisplay(value)}
      </span>
    );
  };
}

const NameCell = makeEditableCell<string>({
  field: 'name',
  inputClassName: 'block w-full',
  displayClassName: 'block w-full',
  toEditValue: (value) => value,
  renderDisplay: (value) => <Truncated text={value} />,
});

const DescriptionCell = makeEditableCell<string | null>({
  field: 'description',
  inputClassName: 'block w-full',
  displayClassName: 'block w-full',
  toEditValue: (value) => value ?? '',
  renderDisplay: (value) => <Truncated text={value} />,
});

const AmountCell = makeEditableCell<number>({
  field: 'amount',
  inputProps: { type: 'number', min: 1 },
  inputClassName: 'w-20',
  displayClassName: 'inline-block w-20',
  toEditValue: (value) => String(value),
  renderDisplay: (value) => value,
});

/** Ghost icon button with a tooltip — the shape of every row action. */
function IconAction({
  tooltip,
  ariaLabel,
  onClick,
  className,
  children,
}: {
  tooltip: string;
  ariaLabel?: string;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className={className}
          onClick={onClick}
          aria-label={ariaLabel ?? tooltip}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

interface SelectOption {
  value: string;
  label: string;
}

/**
 * "Apply one category/location to everything selected." The category and
 * location flows are the same dialog with different nouns.
 */
function BulkAssignDialog({
  open,
  onOpenChange,
  title,
  description,
  options,
  placeholder,
  value,
  onValueChange,
  confirmLabel,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  options: SelectOption[];
  placeholder: string;
  value: SelectOption | null;
  onValueChange: (value: SelectOption | null) => void;
  confirmLabel: string;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <CreatableSelect
          options={options}
          value={value}
          onChange={(opt) => onValueChange(opt as SelectOption | null)}
          placeholder={placeholder}
          isClearable
        />
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Peruuta
          </Button>
          <Button onClick={onConfirm} disabled={!value}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const TYPE_FILTERS = [
  { value: 'all', label: 'Kaikki' },
  { value: 'normal', label: 'Normaali' },
  { value: 'temporary', label: 'Väliaikainen' },
] as const;

// TanStack Table v9 features are opt-in — an API is missing at runtime when its
// feature isn't registered here. The server does all the filtering, sorting and
// paging (the table only ever holds one page), so we register the interaction
// features we actually call and no row models: sorting for the header toggles,
// pagination for the pager buttons, selection for the bulk-action checkboxes,
// and sizing for the per-column `size` / `header.getSize()`.
const features = tableFeatures({
  columnSizingFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
});

const colHelper = createColumnHelper<typeof features, InventoryItem>();

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

  const [editItem, setEditItem] = useState<InventoryItem | null>(null);

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

  // A debounce timer for background saves while the user is still typing in
  // a cell. Cleared whenever editing ends (Enter / blur / Escape) so a late
  // tick can never write a value the user just abandoned.
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearAutoSaveTimer = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
  }, []);
  useEffect(() => clearAutoSaveTimer, [clearAutoSaveTimer]);
  // Any path that ends editing (Escape, blur, switching to another cell)
  // sets editState to null. Mirror that into the autosave timer so a
  // pending tick can't fire against an abandoned value.
  useEffect(() => {
    if (!editState) clearAutoSaveTimer();
  }, [editState, clearAutoSaveTimer]);

  const startEdit = useCallback((rowId: string, field: EditableField, currentValue: string) => {
    setEditState({ rowId, field, value: currentValue });
    setTimeout(() => editInputRef.current?.focus(), 0);
  }, []);

  // Persist the field. When `keepEditing` is true, the editor stays open
  // (used by autosave so the user can keep typing); otherwise it closes
  // (used by Enter / blur).
  const saveEdit = useCallback(async (state: CellEditState, { keepEditing = false } = {}) => {
    if (!keepEditing) setEditState(null);
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
      if (!keepEditing) toast.success('Tallennettu');
    } catch (err) {
      toast.error('Tallennus epäonnistui', {
        description: err instanceof Error ? err.message : undefined,
      });
      mutateItems();
    } finally {
      removePending(rowId);
    }
  }, [items, mutateItems, updateItemLocal]);

  const commitEdit = useCallback((state: CellEditState) => {
    clearAutoSaveTimer();
    void saveEdit(state, { keepEditing: false });
  }, [clearAutoSaveTimer, saveEdit]);

  const scheduleAutoSave = useCallback((state: CellEditState) => {
    clearAutoSaveTimer();
    autoSaveTimerRef.current = setTimeout(() => {
      autoSaveTimerRef.current = null;
      void saveEdit(state, { keepEditing: true });
    }, 1000);
  }, [clearAutoSaveTimer, saveEdit]);

  // Archive and restore are the same call with a different endpoint: mark the
  // row pending, POST its id, then revalidate the page either way so the row
  // leaves (or stays muted when the archive toggle is on) and the page
  // backfills from the server.
  const runRowAction = useCallback(
    async (item: InventoryItem, url: string, successMessage: string, errorMessage: string) => {
      addPending(item.id);
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.id),
        });
        if (!res.ok) throw new Error(errorMessage);
        toast.success(successMessage);
      } catch {
        toast.error(errorMessage);
      } finally {
        removePending(item.id);
        mutateItems();
      }
    },
    [mutateItems],
  );

  const handleDeleteRow = (item: InventoryItem) => {
    setDeleteTarget(null);
    void runRowAction(item, '/api/item/deleteItem', 'Kama arkistoitu', 'Arkistointi epäonnistui');
  };

  const handleRestoreRow = useCallback(
    (item: InventoryItem) => {
      void runRowAction(item, '/api/item/restoreItem', 'Kama palautettu', 'Palautus epäonnistui');
    },
    [runRowAction],
  );

  const selectedIds = Object.keys(rowSelection).filter((k) => rowSelection[k]);

  /** Every bulk action posts to the same endpoint and clears the selection. */
  const runBulkAction = async (
    body: Record<string, unknown>,
    successMessage: (count: number) => string,
    errorMessage: string,
    onSuccess?: () => void,
  ) => {
    const ids = selectedIds;
    ids.forEach(addPending);
    try {
      const res = await fetch('/api/item/bulkItems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, ids }),
      });
      if (!res.ok) throw new Error('Virhe');
      setRowSelection({});
      onSuccess?.();
      toast.success(successMessage(ids.length));
    } catch {
      toast.error(errorMessage);
    } finally {
      ids.forEach(removePending);
      mutateItems();
    }
  };

  const handleBulkDelete = () => {
    setBulkDeleteOpen(false);
    void runBulkAction(
      { action: 'delete' },
      (n) => `${n} kamaa arkistoitu`,
      'Massapoisto epäonnistui',
    );
  };

  const handleBulkSetCategory = () => {
    if (!bulkCategoryValue) return;
    setBulkCategoryOpen(false);
    void runBulkAction(
      { action: 'setCategory', categoryName: bulkCategoryValue.label },
      (n) => `Kategoria asetettu ${n} kamalle`,
      'Kategoria-asetus epäonnistui',
      () => setBulkCategoryValue(null),
    );
  };

  const handleBulkSetLocation = () => {
    if (!bulkLocationValue) return;
    setBulkLocationOpen(false);
    void runBulkAction(
      { action: 'setLocation', locationName: bulkLocationValue.label },
      (n) => `Sijainti asetettu ${n} kamalle`,
      'Sijainnin asetus epäonnistui',
      () => setBulkLocationValue(null),
    );
  };

  // colHelper.columns() (rather than a bare array literal) keeps each column's
  // own value type instead of widening them all to `unknown`.
  const columns = useMemo(() => colHelper.columns([
    colHelper.display({
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
          aria-label="Valitse kaikki"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          aria-label="Valitse rivi"
        />
      ),
      size: 36,
    }),
    colHelper.display({
      id: 'image',
      header: '',
      cell: ({ row }) => (
        <Link
          href={`/item/${row.original.id}`}
          aria-label={`Avaa ${row.original.name}`}
          className="inline-block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          <RowImage itemId={row.original.id} name={row.original.name} />
        </Link>
      ),
      size: 52,
    }),
    colHelper.accessor((row) => row.name, {
      id: 'name',
      header: 'Nimi',
      cell: NameCell,
    }),
    colHelper.accessor((row) => row.description, {
      id: 'description',
      header: 'Kuvaus',
      cell: DescriptionCell,
    }),
    colHelper.accessor((row) => row.amount, {
      id: 'amount',
      header: 'Määrä',
      cell: AmountCell,
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
            {!isArchived && (
              <IconAction
                tooltip="Muokkaa"
                ariaLabel="Muokkaa kamaa"
                onClick={() => setEditItem(item)}
              >
                <Pencil className="h-4 w-4" />
              </IconAction>
            )}
            {item.type === 'temporary' && !isArchived && (
              <IconAction
                tooltip="Siirrä kirjastoon"
                className="text-success hover:bg-success/10"
                onClick={() => setPromoteItem(item)}
              >
                <ArrowUpCircle className="h-4 w-4" />
              </IconAction>
            )}
            {isArchived ? (
              <IconAction
                tooltip="Palauta"
                ariaLabel="Palauta kama"
                className="text-success hover:bg-success/10"
                onClick={() => handleRestoreRow(item)}
              >
                <RotateCcw className="h-4 w-4" />
              </IconAction>
            ) : (
              <IconAction
                tooltip="Arkistoi"
                ariaLabel="Arkistoi kama"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => setDeleteTarget(item)}
              >
                <Trash2 className="h-4 w-4" />
              </IconAction>
            )}
          </div>
        );
      },
    }),
  ]), [handleRestoreRow]);

  const editCellValue = useMemo<EditCellContextValue>(
    () => ({ editState, setEditState, startEdit, commitEdit, scheduleAutoSave, editInputRef }),
    [editState, startEdit, commitEdit, scheduleAutoSave],
  );

  const pageCount = Math.max(1, Math.ceil(total / pagination.pageSize));

  const table = useTable({
    features,
    data: items,
    columns,
    state: { sorting, rowSelection, pagination },
    // Server does the sorting/paging; the table just renders one page.
    manualSorting: true,
    manualPagination: true,
    pageCount,
    rowCount: total,
    onSortingChange: (updater) => {
      setSorting(updater);
      toFirstPage();
    },
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
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
    <EditCellContext.Provider value={editCellValue}>
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
            {TYPE_FILTERS.map(({ value, label }) => (
              <FilterChip
                key={value}
                active={typeFilter === value}
                onClick={() => {
                  setTypeFilter(value);
                  toFirstPage();
                }}
              >
                {label}
              </FilterChip>
            ))}
          </div>
          <FilterChip
            active={showArchived}
            onClick={() => {
              setShowArchived((v) => !v);
              toFirstPage();
            }}
          >
            Näytä arkistoidut
          </FilterChip>
        </div>

        {/* Bulk actions */}
        {selectedIds.length > 0 && (
          <Card variant="muted" padding="none" className="flex items-center gap-3 border-ring/30 bg-muted/40 px-4 py-2">
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
          </Card>
        )}

        {/* Table */}
        <Card padding="none">
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
                  <TableCell colSpan={columns.length} className="py-8 text-center">
                    <EmptyState variant="inline" title="Ei tuloksia" />
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
                    {/* getAllCells, not getVisibleCells: no column is ever
                        hidden, so this saves registering columnVisibilityFeature. */}
                    {row.getAllCells().map((cell) => (
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
        </Card>

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

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Arkistoi kama"
        confirmLabel="Arkistoi"
        onConfirm={() => deleteTarget && handleDeleteRow(deleteTarget)}
      >
        Haluatko varmasti arkistoida kaman{' '}
        <span className="font-bold">{deleteTarget?.name}</span>? Lainahistoria säilyy ja voit
        palauttaa kaman myöhemmin.
      </ConfirmDialog>

      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title="Arkistoi valitut kamat"
        confirmLabel="Arkistoi valitut"
        onConfirm={handleBulkDelete}
      >
        Haluatko varmasti arkistoida <span className="font-bold">{selectedIds.length}</span>{' '}
        kamaa? Lainahistoria säilyy ja voit palauttaa kamat myöhemmin.
      </ConfirmDialog>

      <BulkAssignDialog
        open={bulkCategoryOpen}
        onOpenChange={setBulkCategoryOpen}
        title="Aseta kategoria valituille kamoille"
        description={`Kategoria lisätään ${selectedIds.length} valitulle kamalle. Voit myös luoda uuden kategorian kirjoittamalla sen nimen.`}
        options={categoryOptions}
        placeholder="Valitse tai luo kategoria"
        value={bulkCategoryValue}
        onValueChange={setBulkCategoryValue}
        confirmLabel="Aseta kategoria"
        onConfirm={handleBulkSetCategory}
      />

      <BulkAssignDialog
        open={bulkLocationOpen}
        onOpenChange={setBulkLocationOpen}
        title="Aseta sijainti valituille kamoille"
        description={`Sijainti vaihdetaan ${selectedIds.length} valitulle kamalle. Voit myös luoda uuden sijainnin kirjoittamalla sen nimen.`}
        options={locationOptions}
        placeholder="Valitse tai luo sijainti"
        value={bulkLocationValue}
        onValueChange={setBulkLocationValue}
        confirmLabel="Aseta sijainti"
        onConfirm={handleBulkSetLocation}
      />

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

      {/* Edit dialog — the inline cells cover name/kuvaus/määrä/sijainti; this
          is the full form (kategoriat, kuva). Mounted only while open so the
          form seeds fresh from the row. */}
      {editItem && (
        <EditItemDialog
          item={editItem}
          open
          onOpenChange={(open) => {
            if (!open) setEditItem(null);
          }}
          onSaved={() => void mutateItems()}
        />
      )}
    </EditCellContext.Provider>
  );
}
