'use client';

import React from 'react';
import { Search, X } from 'lucide-react';
import { Category } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckboxIndicator } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

export type SortMode = 'popular' | 'name';

interface CatalogueFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  onSearchKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  searchRef?: React.Ref<HTMLInputElement>;
  /** The rail owns the search box; the drawer leaves it in the sticky strip. */
  showSearch?: boolean;
  sortBy: SortMode;
  onSortChange: (mode: SortMode) => void;
  categories: Category[];
  /** Category names; empty means "Kaikki". */
  selected: string[];
  onToggleCategory: (name: string) => void;
  /** Drops the selection, or puts back the one "Kaikki" replaced. */
  onToggleAll: () => void;
  /** Whether there is a previous selection for "Kaikki" to restore. */
  canRestore: boolean;
}

/**
 * Search + sort + category filters for the catalogue. Rendered twice: as the
 * sticky left rail on wide screens, and inside the "Suodata" drawer below `lg`,
 * where a permanent rail would eat too much of the grid.
 */
export default function CatalogueFilters({
  search,
  onSearchChange,
  onSearchKeyDown,
  searchRef,
  showSearch = false,
  sortBy,
  onSortChange,
  categories,
  selected,
  onToggleCategory,
  onToggleAll,
  canRestore,
}: CatalogueFiltersProps) {
  const showAll = selected.length === 0;

  return (
    <div className="flex flex-col gap-4">
      {showSearch && (
        <div className="relative">
          <Input
            ref={searchRef}
            placeholder="Hae kamoja"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={onSearchKeyDown}
            className="h-9 pr-9"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {search ? (
              <X
                role="button"
                className="h-4 w-4 cursor-pointer"
                onClick={() => onSearchChange('')}
                aria-label="Tyhjennä haku"
              />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Järjestys
        </span>
        <div className="flex gap-1.5">
          <Button
            size="xs"
            className="flex-1"
            onClick={() => onSortChange('popular')}
            variant={sortBy === 'popular' ? 'default' : 'outline-solid'}
          >
            Suosituimmat
          </Button>
          <Button
            size="xs"
            className="flex-1"
            onClick={() => onSortChange('name')}
            variant={sortBy === 'name' ? 'default' : 'outline-solid'}
          >
            Nimi
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        {/* "Kaikki" isn't one of the categories — it's the switch that turns the
            whole filter off, so it sits on the heading row as a toggle rather
            than pretending to be another checkbox. */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Kategoriat
          </span>
          <Button
            size="xs"
            variant={showAll ? 'default' : 'outline-solid'}
            aria-pressed={showAll}
            disabled={showAll && !canRestore}
            onClick={onToggleAll}
            title={showAll && canRestore ? 'Palauta edellinen valinta' : undefined}
          >
            Kaikki
          </Button>
        </div>
        <div className="flex flex-col">
          {/* With the filter off every category is in play, so show them ticked;
              clicking one from that state narrows to just it. */}
          {categories.map((cat) => (
            <CategoryRow
              key={cat.id}
              label={cat.name}
              checked={showAll || selected.includes(cat.name)}
              onClick={() => onToggleCategory(cat.name)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Deliberately a button with its own check box rather than a real checkbox: the
// whole row is the target, which matters most on the kiosk's touch screen.
function CategoryRow({
  label,
  checked,
  onClick,
}: {
  label: string;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onClick}
      className={cn(
        'flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-muted',
        checked && 'font-semibold text-primary',
      )}
    >
      <CheckboxIndicator checked={checked} />
      <span className="truncate">{label}</span>
    </button>
  );
}
