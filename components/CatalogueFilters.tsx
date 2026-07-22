'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { FaSearch, FaTimes } from 'react-icons/fa';
import { Category } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  onClearCategories: () => void;
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
  onClearCategories,
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
              <FaTimes
                role="button"
                className="cursor-pointer"
                onClick={() => onSearchChange('')}
                aria-label="Tyhjennä haku"
              />
            ) : (
              <FaSearch />
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
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Kategoriat
        </span>
        <div className="flex flex-col">
          {/* "Kaikki" means every category is included, so show them all ticked.
              Clicking one from that state narrows to just it. */}
          <CategoryRow label="Kaikki" checked={showAll} onClick={onClearCategories} />
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
      <span
        className={cn(
          'flex size-4 shrink-0 items-center justify-center rounded-[4px] border',
          checked ? 'border-primary bg-primary text-primary-foreground' : 'border-input',
        )}
      >
        {checked && <Check className="size-3" strokeWidth={3} />}
      </span>
      <span className="truncate">{label}</span>
    </button>
  );
}
