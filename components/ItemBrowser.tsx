import React, { useState } from 'react';
import { FaSearch, FaInfoCircle, FaTimes } from 'react-icons/fa';
import AllItems from '../pages/productlist';
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
      <div className="p-1">
        <div className="relative mb-4 w-fit">
          <Input
            placeholder="Hae kamoja"
            value={search}
            onChange={handleChange}
            className="pr-9"
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
      </div>
      <div className="hidden py-8 pl-0 md:block">
        <div className="flex flex-wrap gap-2 p-1">
          <Button
            key="all"
            onClick={() => setCategory('')}
            variant={category === '' ? 'default' : 'outline'}
          >
            Kaikki
          </Button>
          {[...categories]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((cat) => (
              <Button
                key={cat.id}
                onClick={() => setCategory(category === cat.name ? '' : cat.name)}
                variant={category === cat.name ? 'default' : 'outline'}
              >
                {cat.name}
              </Button>
            ))}
        </div>
      </div>
      <div className="py-8 pl-0 md:hidden">
        <select
          className={cn(
            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
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
      {showCustomItemLink && (
        <>
          <div className="mb-4 flex items-center gap-3 rounded-md border-l-4 border-primary bg-primary/10 p-4">
            <FaInfoCircle className="h-5 w-5 text-primary" />
            <p className="text-sm">
              Jos haluamaasi kamaa ei löydy,{' '}
              <button
                type="button"
                className="font-semibold text-primary underline hover:text-primary/80"
                onClick={() => setDialogOpen(true)}
              >
                klikkaa tästä
              </button>
            </p>
          </div>
          <CustomItemDialog isOpen={dialogOpen} onClose={() => setDialogOpen(false)} />
        </>
      )}
      {filteredItems.length > 0 ? (
        renderItems ? (
          renderItems(filteredItems)
        ) : (
          <AllItems items={filteredItems} categories={categories} />
        )
      ) : (
        <h2 className="mt-4 text-center text-2xl font-semibold">Ei hakutuloksia :(</h2>
      )}
    </>
  );
}
