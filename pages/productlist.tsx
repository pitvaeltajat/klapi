import React from "react";
import { SimpleGrid } from "@chakra-ui/react";
import ItemCard from "../components/ItemCard";
import { useSelector } from "react-redux";
import { useState } from "react";
import { useEffect } from "react";
import { Item, Category } from "@prisma/client";

interface ItemWithCategories extends Item {
  categories: Category[];
}

interface Availability {
  available: number;
}

interface Availabilities {
  [key: string]: Availability;
}

interface AvailabilityResponse {
  availabilities: Record<string, Availability>;
}

interface AllItemsProps {
  items: ItemWithCategories[];
  categories: Category[];
}

interface DateState {
  startDate: string;
  endDate: string;
}

export default function AllItems({ items }: AllItemsProps) {
  const dates = useSelector<{ dates: DateState }, DateState>(
    (state) => state.dates
  );

  const [data, setData] = useState<AvailabilityResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const StartDate = dates.startDate;
  const EndDate = dates.endDate;

  useEffect(() => {
    setLoading(true);
    fetch("/api/availability/getAvailabilities", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ StartDate, EndDate }),
    })
      .then((response) => response.json())
      .then((data: AvailabilityResponse) => {
        setData(data);
        setLoading(false);
      })
      .catch((error) => console.log(error));
  }, [StartDate, EndDate]);

  const availabilities = data?.availabilities;

  if (loading) {
    return <div>Ladataan...</div>;
  }

  return (
    <>
      <SimpleGrid columns={[1, 2, 2, 3, 4]} spacing={[4, 6, 8, 10]}>
        {items.map((item) => (
          <ItemCard
            key={item.id}
            item={{
              id: item.id,
              name: item.name,
              description: item.description || undefined,
              amount: item.amount,
              image: item.image || undefined,
              categories: item.categories.map((cat) => ({
                id: cat.id,
                name: cat.name,
              })),
            }}
            availableAmount={availabilities?.[item.id]?.available ?? 0}
          />
        ))}
      </SimpleGrid>
    </>
  );
}
