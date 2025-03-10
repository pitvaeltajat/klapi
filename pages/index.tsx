import React from "react";
import prisma from "../utils/prisma";
import DateSelector from "../components/DateSelector";
import {
  Box,
  Heading,
  Input,
  InputGroup,
  InputRightElement,
  Button,
  Wrap,
  WrapItem,
} from "@chakra-ui/react";
import { FaSearch } from "react-icons/fa";
import AllItems from "./productlist";
import type { GetServerSideProps } from "next";
import type { Item, Category, Loan, Reservation } from "@prisma/client";
import { useDates } from "@/contexts/DatesContext";

interface ItemWithRelations extends Item {
  categories: Category[];
  reservations: (Reservation & { loan: Loan })[];
}

interface IndexProps {
  items: ItemWithRelations[];
  categories: Category[];
}

interface DateState {
  datesSet: boolean;
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

  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const filteredItems = items
    .filter((item) => {
      return item.name.toLowerCase().includes(search.toLowerCase());
    })
    .filter((item) => {
      if (category === "") {
        return true;
      } else {
        return item.categories.some((cat) => cat.name === category);
      }
    });

  return (
    <>
      {dates.datesSet ? (
        <>
          <DateSelector />
          <Box padding="4px">
            <InputGroup width={"fit-content"}>
              <Input
                placeholder="Hae kamoja"
                marginBottom={"1em"}
                value={search}
                onChange={handleChange}
              />
              <InputRightElement>
                <FaSearch />
              </InputRightElement>
            </InputGroup>
          </Box>
          <Box padding="2em" paddingLeft={0}>
            <Heading as="h2" size="md" marginBottom={"1em"}>
              Kategoriat
            </Heading>
            <Wrap padding="4px">
              <WrapItem key="all">
                <Button onClick={() => setCategory("")}>Kaikki</Button>
              </WrapItem>
              {categories.map((category) => (
                <WrapItem key={category.id}>
                  <Button onClick={() => setCategory(category.name)}>
                    {category.name}
                  </Button>
                </WrapItem>
              ))}
            </Wrap>
          </Box>
          <Box padding="1em" paddingLeft={0}>
            {category !== "" && (
              <Heading as="h2" size="md" marginBottom={"1em"}>
                Valittu kategoria: {category}
              </Heading>
            )}
          </Box>
          {filteredItems.length > 0 ? (
            <AllItems items={filteredItems} categories={categories} />
          ) : (
            <Heading textAlign="center" marginTop="1em">
              Ei hakutuloksia :(
            </Heading>
          )}
        </>
      ) : (
        <DateSelector />
      )}
    </>
  );
}
