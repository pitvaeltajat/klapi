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
  Container,
  Card,
  CardBody,
  VStack,
  Skeleton,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import { FaSearch } from "react-icons/fa";
import AllItems from "./productlist";
import type { GetServerSideProps } from "next";
import type { Item, Category, Loan, Reservation } from "@prisma/client";
import { useDates } from "@/contexts/DatesContext";
import UserSelector from "@/components/UserSelector";

interface ItemWithRelations extends Item {
  categories: Category[];
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
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState("");
  const bgColor = useColorModeValue("white", "gray.800");

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
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        <UserSelector />

        <DateSelector />

        {dates.datesSet && (
          <Card variant="outline" bg={bgColor} shadow="sm">
            <CardBody>
              <VStack spacing={6} align="stretch">
                <Box>
                  <InputGroup maxW="md">
                    <Input
                      placeholder="Hae kamoja"
                      value={search}
                      onChange={handleChange}
                      size="lg"
                      borderRadius="md"
                    />
                    <InputRightElement h="full" pr={2}>
                      <FaSearch color="gray.300" />
                    </InputRightElement>
                  </InputGroup>
                </Box>

                <Box>
                  <Heading as="h2" size="md" mb={4}>
                    Kategoriat
                  </Heading>
                  <Wrap spacing={3}>
                    <WrapItem key="all">
                      <Button
                        onClick={() => setCategory("")}
                        colorScheme={category === "" ? "blue" : "gray"}
                        variant={category === "" ? "solid" : "outline"}
                      >
                        Kaikki
                      </Button>
                    </WrapItem>
                    {categories.map((cat) => (
                      <WrapItem key={cat.id}>
                        <Button
                          onClick={() => setCategory(cat.name)}
                          colorScheme={category === cat.name ? "blue" : "gray"}
                          variant={category === cat.name ? "solid" : "outline"}
                        >
                          {cat.name}
                        </Button>
                      </WrapItem>
                    ))}
                  </Wrap>
                </Box>

                {category !== "" && (
                  <Box>
                    <Text fontSize="lg" fontWeight="medium" color="gray.600">
                      Valittu kategoria: {category}
                    </Text>
                  </Box>
                )}

                <Box>
                  {filteredItems.length > 0 ? (
                    <AllItems items={filteredItems} categories={categories} />
                  ) : (
                    <Card variant="outline" p={8} textAlign="center">
                      <VStack spacing={4}>
                        <Heading size="md" color="gray.500">
                          Ei hakutuloksia
                        </Heading>
                        <Text color="gray.500">Kokeile muuttaa hakuehtoja</Text>
                      </VStack>
                    </Card>
                  )}
                </Box>
              </VStack>
            </CardBody>
          </Card>
        )}
      </VStack>
    </Container>
  );
}
