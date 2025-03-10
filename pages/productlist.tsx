import React from "react";
import { SimpleGrid } from "@chakra-ui/react";
import ItemCard from "../components/ItemCard";
import { useSelector } from "react-redux";
import { useState } from "react";
import { useEffect } from "react";
import type { Item, Category } from "@prisma/client";

interface Availability {
  available: number;
}

interface AvailabilityResponse {
  availabilities: Record<string, Availability>;
}

interface AllItemsProps {
  items: Item[];
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
            item={item}
            availableAmount={availabilities[item.id].available}
          />
        ))}
      </SimpleGrid>
    </>
  );
}
