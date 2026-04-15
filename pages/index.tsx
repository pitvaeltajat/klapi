import React from 'react';
import Head from 'next/head';
import prisma from '../utils/prisma';
import { visibleItemsWhere, itemsWithRelationsInclude } from '../utils/itemQueries';
import DateSelector from '../components/DateSelector';
import KioskModeSelector from '../components/KioskModeSelector';
import KioskDateSelector from '../components/KioskDateSelector';
import type { GetServerSideProps } from 'next';
import { Item, Category, Loan, Reservation, ItemType, Announcement } from '@prisma/client';
import { serialize } from '@/utils/serialize';
import { useDates } from '@/contexts/DatesContext';
import { useSession } from 'next-auth/react';
import ItemBrowser from '../components/ItemBrowser';
import BrowseItemCard from '../components/BrowseItemCard';
import { Button } from '@/components/ui/button';

function BrowseModeHeader({ onExitBrowseMode }: { onExitBrowseMode: () => void }) {
  return (
    <div className="mb-4 flex flex-col gap-4">
      <div>
        <h2 className="mb-2 text-2xl font-semibold">Selaa katalogia</h2>
        <p className="text-muted-foreground">
          Selaat katalogia ilman varaustoimintoa. Voit tarkastella saatavilla olevia kamoja.
        </p>
      </div>
      <div>
        <Button onClick={onExitBrowseMode}>Siirry varaamaan</Button>
      </div>
    </div>
  );
}

interface ItemWithRelations extends Item {
  categories: Category[];
  type: ItemType;
  reservations: (Reservation & { loan: Loan })[];
  announcements: Announcement[];
}

interface IndexProps {
  items: ItemWithRelations[];
  categories: Category[];
}

export const getServerSideProps: GetServerSideProps<IndexProps> = async () => {
  const items = await prisma.item.findMany({
    where: visibleItemsWhere,
    include: itemsWithRelationsInclude,
    orderBy: { name: 'asc' },
  });
  const categories = await prisma.category.findMany({ include: { items: true } });
  return { props: serialize({ items, categories }) };
};

export default function Index({ items, categories }: IndexProps) {
  const { state: dates, setBrowseMode, setStartDate, setEndDate, setDatesSet } = useDates();
  const { data: session } = useSession();

  const isKioskMode = session?.user?.group === 'KIOSK';

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

  const filteredItems = items.map((item) => ({
    ...item,
    announcements: item.announcements.filter(
      (a) => a.expiresAt === null || new Date(a.expiresAt) > new Date(),
    ),
  }));

  return (
    <>
      <Head>
        <title>Etusivu | Klapi</title>
      </Head>
      {dates.browseMode ? (
        <>
          <BrowseModeHeader onExitBrowseMode={handleExitBrowseMode} />
          <ItemBrowser
            items={filteredItems}
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
        </>
      ) : isKioskMode ? (
        <>
          {!dates.datesSet ? (
            <KioskModeSelector />
          ) : (
            <>
              <KioskDateSelector />
              <ItemBrowser items={filteredItems} categories={categories} showCustomItemLink />
            </>
          )}
        </>
      ) : (
        <>
          {dates.datesSet ? (
            <>
              <DateSelector />
              <ItemBrowser items={filteredItems} categories={categories} showCustomItemLink />
            </>
          ) : (
            <DateSelector />
          )}
        </>
      )}
    </>
  );
}
