import Head from 'next/head';
import { Heading, SimpleGrid, Text } from '@chakra-ui/react';
import { Item, Category, Loan, Reservation } from '@prisma/client';
import ItemBrowser from '../../components/ItemBrowser';
import BrowseItemCard from '../../components/BrowseItemCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import useSWR from 'swr';

interface ItemWithRelations extends Item {
  categories: Category[];
  location: { id: string; name: string } | null;
  reservations: (Reservation & { loan: Loan })[];
}

interface BrowseData {
  items: ItemWithRelations[];
  categories: Category[];
}

export default function BrowseItems() {
  const { data, error, isLoading } = useSWR<BrowseData>('/api/item/getBrowseItems');

  if (isLoading) {
    return <LoadingSpinner fullWidth />;
  }

  if (error || !data) {
    return <Text color="red.500">Virhe ladattaessa kamoja</Text>;
  }

  const { items, categories } = data;

  const sortedItems = [...items].sort((a, b) => a.name.localeCompare(b.name));
  const sortedCategories = [...categories].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <Head>
        <title>Kaikki kamat | Klapi</title>
      </Head>
      <Heading as="h1" size="xl" mb={6}>
        Kaikki kamat
      </Heading>
      <ItemBrowser
        items={sortedItems}
        categories={sortedCategories}
        renderItems={(filteredItems) => (
          <SimpleGrid columns={{ base: 1, sm: 2, md: 2, lg: 3, xl: 4 }} gap={[4, 6, 8, 10]}>
            {filteredItems.map((item) => (
              <BrowseItemCard key={item.id} item={item} />
            ))}
          </SimpleGrid>
        )}
      />
    </>
  );
}
