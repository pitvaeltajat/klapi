import { Heading } from "@chakra-ui/react";
import prisma from "../../utils/prisma";
import { Item, Category, Loan, Reservation } from "@prisma/client";
import ItemBrowser from "../../components/ItemBrowser";

interface ItemWithRelations extends Item {
  categories: Category[];
  location: { id: string; name: string } | null;
  reservations: (Reservation & { loan: Loan })[];
}

export async function getServerSideProps() {
  const items = await prisma.item.findMany({
    include: {
      categories: true,
      location: true,
      reservations: { include: { loan: true } },
    },
  });

  const categories = await prisma.category.findMany({
    include: {
      items: true,
    },
  });

  return {
    props: {
      items: JSON.parse(JSON.stringify(items)),
      categories: JSON.parse(JSON.stringify(categories)),
    },
  };
}

export default function BrowseItems({
  items,
  categories,
}: {
  items: ItemWithRelations[];
  categories: Category[];
}) {
  const sortedItems = items.sort((a, b) => {
    return a.name.localeCompare(b.name);
  });

  const sortedCategories = categories.sort((a, b) => {
    return a.name.localeCompare(b.name);
  });

  return (
    <>
      <Heading as="h1" size="2xl">
        Kaikki kamat
      </Heading>
      <ItemBrowser
        items={sortedItems}
        categories={sortedCategories}
        filterByType={false}
        categoryLayout="select"
      />
    </>
  );
}
