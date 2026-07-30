'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Info, Search, SlidersHorizontal, X } from 'lucide-react';
import { toast } from 'sonner';
import AllItems from './ItemGrid';
import { Item, Category, Loan, Reservation, Announcement } from '@prisma/client';
import CustomItemDialog from './CustomItemDialog';
import CatalogueFilters, { type SortMode } from './CatalogueFilters';
import FilterFlyout from './FilterFlyout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { CountBadge } from '@/components/ui/count-badge';
import { useCart } from '@/contexts/CartContext';
import { useAvailabilities } from '@/hooks/useAvailabilities';
import TemplateSection from './TemplateSection';

interface ItemWithRelations extends Item {
  categories: Category[];
  reservations?: (Reservation & { loan: Loan })[];
  announcements: Announcement[];
  /** Bookings within the rolling window; drives the "Suosituimmat" sort. */
  popularity?: number;
}

// Finnish collation: ä/å/ö sort at the END of the alphabet, not next to a/o.
// The DB collation can't be relied on for this, so order client-side instead.
const fiCollator = new Intl.Collator('fi');

interface ItemBrowserProps {
  items: ItemWithRelations[];
  categories: Category[];
  showCustomItemLink?: boolean;
  renderItems?: (items: ItemWithRelations[]) => React.ReactNode;
  /** Optional content pinned inline at the right end of the search row (the
   *  chosen loan dates), so it stays visible while items scroll without
   *  costing the sticky header a line of its own. */
  headerSlot?: React.ReactNode;
  /** Show the "Valmiit setit" chips. Off in browse mode, which has no cart to
   *  add them to and no chosen dates to check availability against. */
  showTemplates?: boolean;
}

export default function ItemBrowser({
  items,
  categories,
  showCustomItemLink = false,
  renderItems,
  headerSlot,
  showTemplates = false,
}: ItemBrowserProps) {
  const [search, setSearch] = useState('');
  // `selected` drives the filter (empty = "Kaikki"); `remembered` holds what
  // "Kaikki" replaced, so pressing it again restores that selection. They move
  // together, hence one state rather than two.
  const [{ selected: selectedCategories, remembered: rememberedCategories }, setCategoryFilter] =
    useState<{ selected: string[]; remembered: string[] }>({ selected: [], remembered: [] });
  const [sortBy, setSortBy] = useState<SortMode>('popular');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const {
    addToCart,
    state: { items: cartItems },
  } = useCart();
  const { availabilities } = useAvailabilities();

  // Only autofocus on devices with a precise pointer (desktop/kiosk with a real
  // keyboard). On touch devices autofocusing pops up the on-screen keyboard,
  // which is especially disruptive while the date picker is on screen.
  useEffect(() => {
    if (window.matchMedia('(pointer: fine)').matches) {
      searchRef.current?.focus({ preventScroll: true });
    }
  }, []);

  // Escape clears the search and refocuses it from anywhere on the page — but
  // not while a dialog/drawer is open, so Escape can still close those instead.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (document.querySelector('[role="dialog"][data-state="open"]')) return;
      setSearch('');
      searchRef.current?.focus({ preventScroll: true });
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const toggleCategory = (name: string) => {
    setCategoryFilter(({ selected, remembered }) => {
      const next = selected.includes(name)
        ? selected.filter((c) => c !== name)
        : [...selected, name];
      // Emptying the selection is the same as pressing "Kaikki" — remember what
      // it held so the toggle can put it back.
      return { selected: next, remembered: next.length === 0 ? selected : remembered };
    });
  };

  const toggleAllCategories = () => {
    setCategoryFilter(({ selected, remembered }) =>
      selected.length === 0
        ? { selected: remembered, remembered }
        : { selected: [], remembered: selected },
    );
  };

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => fiCollator.compare(a.name, b.name)),
    [categories],
  );

  const filteredItems = items
    .filter((item) => item.name.toLowerCase().includes(search.toLowerCase()))
    // No category picked means everything; several mean the union of them.
    .filter(
      (item) =>
        selectedCategories.length === 0 ||
        item.categories.some((cat) => selectedCategories.includes(cat.name)),
    )
    .sort((a, b) => {
      if (sortBy === 'popular') {
        const diff = (b.popularity ?? 0) - (a.popularity ?? 0);
        if (diff !== 0) return diff;
      }
      // Alphabetical for the "name" mode and as the tiebreaker for "popular".
      return fiCollator.compare(a.name, b.name);
    });

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    if (!search.trim()) return;
    if (filteredItems.length !== 1) return;
    const only = filteredItems[0];
    const current = cartItems.find((c) => c.id === only.id)?.amount ?? 0;
    if (availabilities === null) return;
    const available = availabilities[only.id]?.available ?? 0;
    if (current + 1 > available) {
      toast.warning('Ei saatavilla', {
        description: `${only.name} ei ole enempää vapaana valitulla ajanjaksolla`,
        duration: 2000,
      });
      return;
    }
    addToCart({ id: only.id, name: only.name, amount: current + 1 });
    toast.success('Lisättiin kama', {
      description: `${only.name} lisätty ostoskoriin`,
      duration: 1500,
    });
  };

  const showSets = showTemplates && !search.trim() && selectedCategories.length === 0;

  const filters = (
    <CatalogueFilters
      search={search}
      onSearchChange={setSearch}
      onSearchKeyDown={handleSearchKeyDown}
      sortBy={sortBy}
      onSortChange={setSortBy}
      categories={sortedCategories}
      selected={selectedCategories}
      onToggleCategory={toggleCategory}
      onToggleAll={toggleAllCategories}
      canRestore={rememberedCategories.length > 0}
    />
  );

  return (
    <>
      <div className="sticky top-16 z-30 -mx-4 flex flex-col gap-2 border-b bg-background/95 px-4 pb-3 pt-2 backdrop-blur-xs">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          {/* Search stays out here at every width; sort and categories live in
              the hover flyout on `lg`+ and in the "Suodata" sheet below it. */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-56 sm:flex-none">
              <Input
                ref={searchRef}
                placeholder="Hae kamoja"
                value={search}
                onChange={handleChange}
                onKeyDown={handleSearchKeyDown}
                className="h-9 pr-9"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {search ? (
                  <X
                    role="button"
                    className="h-4 w-4 cursor-pointer"
                    onClick={() => setSearch('')}
                    aria-label="Tyhjennä haku"
                  />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-9 shrink-0 gap-1.5 lg:hidden"
              onClick={() => setFiltersOpen(true)}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Suodata
              {selectedCategories.length > 0 && <CountBadge count={selectedCategories.length} />}
            </Button>
          </div>
          {showCustomItemLink && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Info className="h-4 w-4 shrink-0 text-primary" />
              <p>
                Jos haluamaasi kamaa ei löydy,{' '}
                <button
                  type="button"
                  className="cursor-pointer font-semibold text-primary underline hover:text-primary/80"
                  onClick={() => setDialogOpen(true)}
                >
                  klikkaa tästä
                </button>
              </p>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 text-sm sm:ml-auto">{headerSlot}</div>
        </div>
      </div>
      {showCustomItemLink && (
        <CustomItemDialog isOpen={dialogOpen} onClose={() => setDialogOpen(false)} />
      )}

      <Drawer open={filtersOpen} onOpenChange={setFiltersOpen}>
        {/* A bottom sheet rather than a side panel: the top bar is painted above
            the drawer layer, so a full-height panel would lose its first 4rem. */}
        <DrawerContent side="bottom" className="max-h-[75vh] rounded-t-xl p-0">
          {/* Header stays put; only the category list scrolls. */}
          <div className="border-b px-4 py-3">
            <DrawerTitle>Suodata</DrawerTitle>
          </div>
          <div className="flex-1 overflow-y-auto p-4">{filters}</div>
        </DrawerContent>
      </Drawer>

      <FilterFlyout badge={selectedCategories.length}>{filters}</FilterFlyout>

      <div className="pt-4">
        {/* Sets are a starting point for an empty cart, so they only lead the
            page while the catalogue is unfiltered — once you're searching or
            filtering, they'd sit between you and the results. */}
        {showSets && <TemplateSection />}
        {showSets && <h2 className="mb-3 text-lg font-semibold">Kaikki kamat</h2>}
        {filteredItems.length > 0 ? (
          renderItems ? (
            renderItems(filteredItems)
          ) : (
            <AllItems items={filteredItems} categories={categories} />
          )
        ) : (
          <h2 className="mt-4 text-center text-2xl font-semibold">Ei hakutuloksia :(</h2>
        )}
      </div>
    </>
  );
}
