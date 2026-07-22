'use client';

import React, { useEffect, useRef, useState } from 'react';
import { FaSearch, FaInfoCircle, FaTimes } from 'react-icons/fa';
import { toast } from 'sonner';
import AllItems from './ItemGrid';
import { Item, Category, Loan, Reservation, Announcement } from '@prisma/client';
import CustomItemDialog from './CustomItemDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { useCart } from '@/contexts/CartContext';
import { useAvailabilities } from '@/hooks/useAvailabilities';
import TemplatePicker from './TemplatePicker';

interface ItemWithRelations extends Item {
  categories: Category[];
  reservations?: (Reservation & { loan: Loan })[];
  announcements: Announcement[];
  /** Bookings within the rolling window; drives the "Suosituimmat" sort. */
  popularity?: number;
}

type SortMode = 'popular' | 'name';

// Finnish collation: ä/å/ö sort at the END of the alphabet, not next to a/o.
// The DB collation can't be relied on for this, so order client-side instead.
const fiCollator = new Intl.Collator('fi');

interface ItemBrowserProps {
  items: ItemWithRelations[];
  categories: Category[];
  showCustomItemLink?: boolean;
  renderItems?: (items: ItemWithRelations[]) => React.ReactNode;
  /** Optional content pinned above the search row inside the sticky header
   *  (e.g. the chosen loan dates), so it stays visible while items scroll. */
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
  const [category, setCategory] = useState('');
  const [sortBy, setSortBy] = useState<SortMode>('popular');
  const [dialogOpen, setDialogOpen] = useState(false);
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

  const filteredItems = items
    .filter((item) => item.name.toLowerCase().includes(search.toLowerCase()))
    .filter((item) => {
      if (category === '') return true;
      return item.categories.some((cat) => cat.name === category);
    })
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

  return (
    <>
      <div className="sticky top-16 z-30 -mx-4 flex flex-col gap-2 border-b bg-background/95 px-4 pb-3 pt-2 backdrop-blur-xs">
        {headerSlot && <div className="border-b pb-2">{headerSlot}</div>}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <div className="relative w-full sm:w-fit">
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
          <div className="flex items-center gap-1 text-sm sm:ml-auto">
            <span className="hidden text-muted-foreground sm:inline">Järjestys:</span>
            <Button
              size="xs"
              onClick={() => setSortBy('popular')}
              variant={sortBy === 'popular' ? 'default' : 'outline-solid'}
            >
              Suosituimmat
            </Button>
            <Button
              size="xs"
              onClick={() => setSortBy('name')}
              variant={sortBy === 'name' ? 'default' : 'outline-solid'}
            >
              Nimi
            </Button>
          </div>
        </div>
        {showTemplates && <TemplatePicker />}
        <div className="hidden md:block">
          <div className="flex flex-wrap gap-1.5">
            <Button
              key="all"
              size="xs"
              onClick={() => setCategory('')}
              variant={category === '' ? 'default' : 'outline-solid'}
            >
              Kaikki
            </Button>
            {[...categories]
              .sort((a, b) => fiCollator.compare(a.name, b.name))
              .map((cat) => (
                <Button
                  key={cat.id}
                  size="xs"
                  onClick={() => setCategory(category === cat.name ? '' : cat.name)}
                  variant={category === cat.name ? 'default' : 'outline-solid'}
                >
                  {cat.name}
                </Button>
              ))}
          </div>
        </div>
        <div className="md:hidden">
          <NativeSelect
            className="h-9 py-1.5"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Kaikki</option>
            {[...categories]
              .sort((a, b) => fiCollator.compare(a.name, b.name))
              .map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
          </NativeSelect>
        </div>
      </div>
      {showCustomItemLink && (
        <CustomItemDialog isOpen={dialogOpen} onClose={() => setDialogOpen(false)} />
      )}
      <div className="pt-4">
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
