'use client';

import React, { useState } from 'react';
import { FaSearch, FaInfoCircle, FaTimes } from 'react-icons/fa';
import AllItems from './ItemGrid';
import { Item, Category, Loan, Reservation, Announcement } from '@prisma/client';
import CustomItemDialog from './CustomItemDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface ItemWithRelations extends Item {
  categories: Category[];
  reservations?: (Reservation & { loan: Loan })[];
  announcements: Announcement[];
}

interface ItemBrowserProps {
  items: ItemWithRelations[];
  categories: Category[];
  showCustomItemLink?: boolean;
  renderItems?: (items: ItemWithRelations[]) => React.ReactNode;
}

export default function ItemBrowser({
  items,
  categories,
  showCustomItemLink = false,
  renderItems,
}: ItemBrowserProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const filteredItems = items
    .filter((item) => item.name.toLowerCase().includes(search.toLowerCase()))
    .filter((item) => {
      if (category === '') return true;
      return item.categories.some((cat) => cat.name === category);
    });

  return (
    <>
      <div className="sticky top-16 z-30 -mx-4 flex flex-col gap-2 border-b bg-background/95 px-4 pb-3 pt-2 backdrop-blur-xs">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <div className="relative w-full sm:w-fit">
            <Input
              placeholder="Hae kamoja"
              value={search}
              onChange={handleChange}
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
        </div>
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
              .sort((a, b) => a.name.localeCompare(b.name))
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
          <select
            className={cn(
              'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            )}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Kaikki</option>
            {[...categories]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
          </select>
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
