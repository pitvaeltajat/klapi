import React from "react";
import prisma from "/utils/prisma";
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
import { useSelector } from "react-redux";

export async function getServerSideProps() {
  const items = await prisma.Item.findMany({
    include: {
      categories: true,
      reservations: { include: { loan: true } },
    },
    orderBy: { name: "asc" },
  });
  const categories = await prisma.Category.findMany({
    orderBy: { name: "asc" },
  });
  return { props: { items, categories } };
}

export default function Index({ items, categories }) {
  const datesSet = useSelector((state) => state.dates.datesSet);

  const [search, setSearch] = React.useState("");

  const [category, setCategory] = React.useState("");

  const handleChange = (e) => {
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
      {datesSet ? (
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
