'use client';

import React, { Suspense, use, useState } from 'react';
import NextLink from 'next/link';
import { FaPlus } from 'react-icons/fa';
import { LayoutGrid, Table as TableIcon } from 'lucide-react';
import DateSelector from '@/components/DateSelector';
import DateSummaryBar from '@/components/DateSummaryBar';
import KioskModeSelector from '@/components/KioskModeSelector';
import KioskDateSelector from '@/components/KioskDateSelector';
import { Item, Category, ItemType, Announcement } from '@prisma/client';
import { useDates } from '@/contexts/DatesContext';
import { useSession } from 'next-auth/react';
import ItemBrowser from '@/components/ItemBrowser';
import BrowseItemCard from '@/components/BrowseItemCard';
import InventoryView from '@/components/inventory/InventoryView';
import PendingPickupBanner from '@/components/PendingPickupBanner';
import { Button } from '@/components/ui/button';
import { ItemCardSkeletonGrid } from '@/components/ItemCardSkeleton';

type BrowseViewMode = 'grid' | 'table';

function BrowseModeHeader({
  onExitBrowseMode,
  isAdmin,
  viewMode,
  onViewModeChange,
}: {
  onExitBrowseMode: () => void;
  isAdmin: boolean;
  viewMode: BrowseViewMode;
  onViewModeChange: (mode: BrowseViewMode) => void;
}) {
  return (
    <div className="mb-4 flex flex-col gap-4">
      <div>
        <h2 className="mb-2 text-xl font-semibold">Selaa katalogia</h2>
        <p className="text-muted-foreground">
          Selaat katalogia ilman lainatoimintoa. Voit tarkastella saatavilla olevia kamoja.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={onExitBrowseMode}>Siirry lainaamaan</Button>
        {isAdmin && (
          <Button asChild variant="success" className="gap-2">
            <NextLink href="/admin/createItem">
              <FaPlus /> Luo uusi kama
            </NextLink>
          </Button>
        )}
        {isAdmin && (
          <div className="ml-auto flex gap-1">
            <Button
              size="sm"
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              onClick={() => onViewModeChange('grid')}
              aria-label="Ruudukkonäkymä"
              className="gap-2"
            >
              <LayoutGrid className="h-4 w-4" /> Ruudukko
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'table' ? 'default' : 'outline'}
              onClick={() => onViewModeChange('table')}
              aria-label="Taulukkonäkymä"
              className="gap-2"
            >
              <TableIcon className="h-4 w-4" /> Taulukko
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

interface ItemWithRelations extends Item {
  categories: Category[];
  type: ItemType;
  announcements: Announcement[];
  /** Bookings within the rolling window; drives the "Suosituimmat" sort. */
  popularity: number;
}

interface Catalogue {
  items: ItemWithRelations[];
  categories: Category[];
}

interface HomeClientProps {
  cataloguePromise: Promise<Catalogue>;
}

// Unwraps the streamed catalogue promise. Rendered only inside a Suspense
// boundary, so it suspends until the items query resolves while the
// no-catalogue views (DateSelector / KioskModeSelector) paint immediately.
function WithCatalogue({
  promise,
  children,
}: {
  promise: Promise<Catalogue>;
  children: (catalogue: Catalogue) => React.ReactNode;
}) {
  return <>{children(use(promise))}</>;
}

export default function HomeClient({ cataloguePromise }: HomeClientProps) {
  const { state: dates, setBrowseMode, setStartDate, setEndDate, setDatesSet } = useDates();
  const { data: session } = useSession();

  const isKioskMode = session?.user?.group === 'KIOSK';
  const isAdmin = session?.user?.group === 'ADMIN';

  const [browseViewMode, setBrowseViewMode] = useState<BrowseViewMode>('table');

  const handleExitBrowseMode = () => {
    setBrowseMode(false);
    if (isKioskMode) {
      const now = new Date();
      const oneWeekLater = new Date();
      oneWeekLater.setDate(oneWeekLater.getDate() + 7);
      oneWeekLater.setHours(18, 0, 0, 0);
      setStartDate(now);
      setEndDate(oneWeekLater);
      setDatesSet(true);
    }
  };

  return (
    <>
      <PendingPickupBanner />
      {dates.browseMode ? (
        <>
          <BrowseModeHeader
            onExitBrowseMode={handleExitBrowseMode}
            isAdmin={isAdmin}
            viewMode={browseViewMode}
            onViewModeChange={setBrowseViewMode}
          />
          {isAdmin && browseViewMode === 'table' ? (
            <InventoryView />
          ) : (
            <Suspense fallback={<ItemCardSkeletonGrid />}>
              <WithCatalogue promise={cataloguePromise}>
                {({ items, categories }) => (
                  <ItemBrowser
                    items={items}
                    categories={categories}
                    showCustomItemLink={false}
                    renderItems={(items) => (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:gap-6 lg:grid-cols-3 lg:gap-8 xl:grid-cols-4 xl:gap-10">
                        {items.map((item) => (
                          <BrowseItemCard key={item.id} item={item} />
                        ))}
                      </div>
                    )}
                  />
                )}
              </WithCatalogue>
            </Suspense>
          )}
        </>
      ) : isKioskMode ? (
        <>
          {!dates.datesSet ? (
            <KioskModeSelector />
          ) : (
            <>
              <KioskDateSelector />
              <Suspense fallback={<ItemCardSkeletonGrid />}>
                <WithCatalogue promise={cataloguePromise}>
                  {({ items, categories }) => (
                    <ItemBrowser items={items} categories={categories} showCustomItemLink />
                  )}
                </WithCatalogue>
              </Suspense>
            </>
          )}
        </>
      ) : (
        <>
          {dates.datesSet ? (
            <Suspense fallback={<ItemCardSkeletonGrid />}>
              <WithCatalogue promise={cataloguePromise}>
                {({ items, categories }) => (
                  <ItemBrowser
                    items={items}
                    categories={categories}
                    showCustomItemLink
                    headerSlot={<DateSummaryBar />}
                  />
                )}
              </WithCatalogue>
            </Suspense>
          ) : (
            <DateSelector />
          )}
        </>
      )}
    </>
  );
}
