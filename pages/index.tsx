import React from "react";
import prisma from "../utils/prisma";
import DateSelector from "../components/DateSelector";
import KioskModeSelector from "../components/KioskModeSelector";
import KioskDateSelector from "../components/KioskDateSelector";
import type { GetServerSideProps } from "next";
import { Item, Category, Loan, Reservation, ItemType } from "@prisma/client";
import { useDates } from "@/contexts/DatesContext";
import { useSession } from "next-auth/react";
import ItemBrowser from "../components/ItemBrowser";

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
    include: {
      categories: true,
      reservations: { include: { loan: true } },
    },
    orderBy: { name: "asc" },
  });
  const categories = await prisma.category.findMany({
    include: {
      items: true,
    },
  });
  return { props: { items, categories } };
};

export default function Index({ items, categories }: IndexProps) {
  const { state: dates } = useDates();
  const { data: session } = useSession();

  const isKioskMode = session?.user?.group === "KIOSK";

  return (
    <>
      {isKioskMode ? (
        <>
          {!dates.datesSet ? (
            <KioskModeSelector />
          ) : (
            <>
              <KioskDateSelector />
              <ItemBrowser
                items={items}
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
                items={items}
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
