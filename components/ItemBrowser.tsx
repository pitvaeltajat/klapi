'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FaSearch, FaInfoCircle, FaTimes } from 'react-icons/fa';
import { SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import AllItems from './ItemGrid';
import { Item, Category, Loan, Reservation, Announcement } from '@prisma/client';
import CustomItemDialog from './CustomItemDialog';
import CatalogueFilters, { type SortMode } from './CatalogueFilters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { useCart } from '@/contexts/CartContext';
import { useAvailabilities } from '@/hooks/useAvailabilities';
import { useCondensedHeader } from '@/hooks/useCondensedHeader';
import { cn } from '@/lib/utils';
import TemplatePicker from './TemplatePicker';

interface ItemWithRelations extends Item {
  categories: Category[];
  reservations?: (Reservation & { loan: Loan })[];
  announcements: Announcement[];
  /** Bookings within the rolling window; drives the "Suosituimmat" sort. */
  popularity?: number;
}

/** Height of the fixed top bar, in px — the sticky offsets are measured off it. */
const TOP_BAR_HEIGHT = 64;

/**
 * A row of the sticky header that folds away while scrolling down. The 0fr/1fr
 * grid is the trick that lets an auto-height row animate; `inert` keeps the
 * hidden buttons out of the tab order and the a11y tree while it's folded.
 */
function Collapsible({
  collapsed,
  className,
  children,
}: {
  collapsed: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'grid transition-[grid-template-rows] duration-200 motion-reduce:transition-none',
        collapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]',
      )}
    >
      <div className="overflow-hidden" inert={collapsed}>
        <div className={className}>{children}</div>
      </div>
    </div>
  );
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
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortMode>('popular');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Two search boxes exist — one in the rail, one in the sticky strip — but only
  // one of them is ever visible, so focus goes to whichever is laid out.
  const searchRef = useRef<HTMLInputElement>(null);
  const stripSearchRef = useRef<HTMLInputElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const condensed = useCondensedHeader();
  const {
    addToCart,
    state: { items: cartItems },
  } = useCart();
  const { availabilities } = useAvailabilities();

  const focusSearch = useCallback(() => {
    const visible = [searchRef.current, stripSearchRef.current].find(
      (input) => input && input.offsetParent !== null,
    );
    visible?.focus({ preventScroll: true });
  }, []);

  // The rail sticks below the strip, whose height changes as the sets row folds
  // away and as the chips wrap, so measure it rather than hard-coding a value.
  const [stripHeight, setStripHeight] = useState(0);
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const observer = new ResizeObserver(() => setStripHeight(strip.offsetHeight));
    observer.observe(strip);
    setStripHeight(strip.offsetHeight);
    return () => observer.disconnect();
  }, []);
  const railTop = (condensed ? 0 : TOP_BAR_HEIGHT) + stripHeight + 16;

  // Only autofocus on devices with a precise pointer (desktop/kiosk with a real
  // keyboard). On touch devices autofocusing pops up the on-screen keyboard,
  // which is especially disruptive while the date picker is on screen.
  useEffect(() => {
    if (window.matchMedia('(pointer: fine)').matches) {
      focusSearch();
    }
  }, [focusSearch]);

  // Escape clears the search and refocuses it from anywhere on the page — but
  // not while a dialog/drawer is open, so Escape can still close those instead.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (document.querySelector('[role="dialog"][data-state="open"]')) return;
      setSearch('');
      focusSearch();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [focusSearch]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const toggleCategory = useCallback((name: string) => {
    setSelectedCategories((current) =>
      current.includes(name) ? current.filter((c) => c !== name) : [...current, name],
    );
  }, []);

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
      onClearCategories={() => setSelectedCategories([])}
    />
  );

  return (
    <>
      <div
        ref={stripRef}
        className={cn(
          'sticky z-30 -mx-4 flex flex-col gap-2 border-b bg-background/95 px-4 pb-3 pt-2 backdrop-blur-xs transition-[top] duration-200 motion-reduce:transition-none',
          // Rides up into the space the top bar vacates while scrolling down.
          condensed ? 'top-0' : 'top-16',
          // Below `lg` the strip always carries the search box; above it, it can
          // end up with nothing left to show (browse mode) — don't draw an
          // empty bar then.
          !showCustomItemLink && !headerSlot && !showTemplates && 'lg:hidden',
        )}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          {/* Search and filters live in the rail on wide screens; below `lg`
              the search stays out here and the rest moves into a drawer. */}
          <div className="flex items-center gap-2 lg:hidden">
            <div className="relative flex-1 sm:w-56 sm:flex-none">
              <Input
                ref={stripSearchRef}
                placeholder="Hae kamoja"
                value={search}
                onChange={handleChange}
                onKeyDown={handleSearchKeyDown}
                className="h-9 pr-9"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {search ? (
                  <FaTimes
                    role="button"
                    className="cursor-pointer"
                    onClick={() => setSearch('')}
                    aria-label="Tyhjennä haku"
                  />
                ) : (
                  <FaSearch />
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-9 shrink-0 gap-1.5"
              onClick={() => setFiltersOpen(true)}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Suodata
              {selectedCategories.length > 0 && (
                <span className="flex size-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {selectedCategories.length}
                </span>
              )}
            </Button>
          </div>
          {showCustomItemLink && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FaInfoCircle className="h-4 w-4 shrink-0 text-primary" />
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
        {showTemplates && (
          <Collapsible collapsed={condensed}>
            <TemplatePicker />
          </Collapsible>
        )}
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

      {/* No `items-start`: the rail column has to stretch to the grid's height,
          otherwise its sticky child has no room to travel. */}
      <div className="flex gap-6 pt-4">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div
            className="sticky overflow-y-auto pr-1 transition-[top] duration-200 motion-reduce:transition-none"
            style={{ top: railTop, maxHeight: `calc(100vh - ${railTop}px - 1rem)` }}
          >
            <CatalogueFilters
              search={search}
              onSearchChange={setSearch}
              onSearchKeyDown={handleSearchKeyDown}
              searchRef={searchRef}
              showSearch
              sortBy={sortBy}
              onSortChange={setSortBy}
              categories={sortedCategories}
              selected={selectedCategories}
              onToggleCategory={toggleCategory}
              onClearCategories={() => setSelectedCategories([])}
            />
          </div>
        </aside>
        <div className="min-w-0 flex-1">
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
      </div>
    </>
  );
}
