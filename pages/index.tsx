import React from 'react';
import Head from 'next/head';
import { Box, Button, Heading, Text, VStack, HStack, SimpleGrid } from '@chakra-ui/react';
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

function BrowseModeHeader({ onExitBrowseMode }: { onExitBrowseMode: () => void }) {
  return (
    <VStack spacing={4} align="stretch" mb={4}>
      <Box>
        <Heading size="lg" mb={2}>
          <HStack>
            <Text>Selaa katalogia</Text>
          </HStack>
        </Heading>
        <Text color="gray.600">
          Selaat katalogia ilman varaustoimintoa. Voit tarkastella saatavilla olevia kamoja.
        </Text>
      </Box>
      <Box>
        <Button colorScheme="blue" onClick={onExitBrowseMode}>
          Siirry varaamaan
        </Button>
      </Box>
    </VStack>
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
  const categories = await prisma.category.findMany({
    include: {
      items: true,
    },
  });
  return { props: serialize({ items, categories }) };
};

export default function Index({ items, categories }: IndexProps) {
  const { state: dates, setBrowseMode, setStartDate, setEndDate, setDatesSet } = useDates();
  const { data: session } = useSession();

  const isKioskMode = session?.user?.group === 'KIOSK';

  const handleExitBrowseMode = () => {
    setBrowseMode(false);
    // For kiosk mode, also set default dates so it goes directly to reservation
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
      <Head>
        <title>Etusivu | Klapi</title>
      </Head>
      {dates.browseMode ? (
        <>
          <BrowseModeHeader onExitBrowseMode={handleExitBrowseMode} />

          <ItemBrowser
            items={items.map((item) => ({
              ...item,
              announcements: item.announcements.filter(
                (a) => a.expiresAt === null || new Date(a.expiresAt) > new Date(),
              ),
            }))}
            categories={categories}
            showCustomItemLink={false}
            renderItems={(filteredItems) => (
              <SimpleGrid columns={{ base: 1, sm: 2, md: 2, lg: 3, xl: 4 }} gap={[4, 6, 8, 10]}>
                {filteredItems.map((item) => (
                  <BrowseItemCard key={item.id} item={item} />
                ))}
              </SimpleGrid>
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
              <ItemBrowser
                items={items.map((item) => ({
                  ...item,
                  announcements: item.announcements.filter(
                    (a) => a.expiresAt === null || new Date(a.expiresAt) > new Date(),
                  ),
                }))}
                categories={categories}
                showCustomItemLink={true}
              />
            </>
          )}
        </>
      ) : (
        <>
          {dates.datesSet ? (
            <>
              <DateSelector />
              <ItemBrowser
                items={items.map((item) => ({
                  ...item,
                  announcements: item.announcements.filter(
                    (a) => a.expiresAt === null || new Date(a.expiresAt) > new Date(),
                  ),
                }))}
                categories={categories}
                showCustomItemLink={true}
              />
            </>
          ) : (
            <DateSelector />
          )}
        </>
      )}
    </>
  );
}
