import React from 'react';
import Head from 'next/head';
import { Box, Button, Heading, Text, VStack, HStack, Icon, SimpleGrid } from '@chakra-ui/react';
import { FaEye } from 'react-icons/fa';
import prisma from '../utils/prisma';
import { visibleItemsWhere, itemsWithRelationsInclude } from '../utils/itemQueries';
import DateSelector from '../components/DateSelector';
import KioskModeSelector from '../components/KioskModeSelector';
import KioskDateSelector from '../components/KioskDateSelector';
import type { GetServerSideProps } from 'next';
import { Item, Category, Loan, Reservation, ItemType } from '@prisma/client';
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
  return { props: { items, categories } };
};

export default function Index({ items, categories }: IndexProps) {
  const { state: dates, setBrowseMode } = useDates();
  const { data: session } = useSession();

  const isKioskMode = session?.user?.group === 'KIOSK';

  return (
    <>
      <Head>
        <title>Etusivu | Klapi</title>
      </Head>
      {dates.browseMode ? (
        <>
          <BrowseModeHeader onExitBrowseMode={() => setBrowseMode(false)} />
          <ItemBrowser
            items={items}
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
              <ItemBrowser items={items} categories={categories} showCustomItemLink={true} />
            </>
          )}
        </>
      ) : (
        <>
          {dates.datesSet ? (
            <>
              <DateSelector />
              <ItemBrowser items={items} categories={categories} showCustomItemLink={true} />
            </>
          ) : (
            <DateSelector />
          )}
        </>
      )}
    </>
  );
}
