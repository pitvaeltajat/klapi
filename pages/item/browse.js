import {
  Heading,
  Table,
  TableContainer,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Link,
  Stack,
  Button,
  Wrap,
  Input,
  InputGroup,
  InputRightElement,
  useColorModeValue,
  Box,
  Flex,
  Image,
  SimpleGrid,
  Select,
  AspectRatio,
} from "@chakra-ui/react";
import prisma from "../../utils/prisma";
import NextLink from "next/link";
import { useState } from "react";
import { FaSearch } from "react-icons/fa";

export async function getServerSideProps(context) {
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
    props: { items, categories }, // will be passed to the page component as props
  };
}

export default function BrowseItems({ items, categories }) {
  items = items.sort((a, b) => {
    return a.name.localeCompare(b.name);
  });

  categories = categories.sort((a, b) => {
    return a.name.localeCompare(b.name);
  });

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
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

  const ItemCard = (item) => {
    return (
      <Box w="full" alignItems="center" justifyContent="center" key={item.id}>
        <Box
          bg={useColorModeValue("white", "gray.800")}
          maxW="sm"
          borderWidth="1px"
          rounded="lg"
          shadow="lg"
          position="relative"
          _hover={{
            shadow: "2xl",
            transform: "scale(1.01)",
            transition: "all 0.2s",
            zIndex: 1,
          }}
        >
          <AspectRatio ratio={5 / 3}>
            <Image
              src={item.image}
              alt={`Picture of ${item.name}`}
              roundedTop="lg"
              objectFit="cover"
              objectPosition="center"
              fallbackSrc="https://placehold.co/500x300"
            />
          </AspectRatio>

          <Box margin={"1.5em"} marginTop={"0.5em"}>
            <Flex mt="1" justifyContent="space-between" alignContent="center">
              <Box
                fontSize="2xl"
                fontWeight="semibold"
                as="h4"
                lineHeight="tight"
                isTruncated
                overflow="hidden"
                noOfLines="1"
                title={item.name}
                _hover={{ textDecoration: "underline" }}
              >
                <Link as={NextLink} href={"/item/" + item.id}>
                  {item.name}
                </Link>
              </Box>
            </Flex>
            <Box fontSize="l" fontWeight="semibold" as="h5">
              {item.amount} kpl
            </Box>
            <Box fontSize="l" fontWeight="semibold" as="h5">
              {item.categories.map((cat) => cat.name).join(", ")}
            </Box>
          </Box>
        </Box>
      </Box>
    );
  };

  return (
    <>
      <Heading as="h1" size="2xl">
        Kaikki kamat
      </Heading>
      <Stack direction="row" spacing={4}>
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
      </Stack>
      <Heading as="h2" size="md" marginBottom={"0.5em"}>
        Kategoriat
      </Heading>
      <Select
        width={"fit-content"}
        marginBottom={"1em"}
        onChange={(e) => setCategory(e.target.value)}
      >
        <option value="">Kaikki</option>
        {categories.map((category) => (
          <option key={category.id} value={category.name}>
            {category.name}
          </option>
        ))}
      </Select>

      <SimpleGrid
        columns={{ base: 1, sm: 2, md: 2, lg: 3, xl: 4 }}
        spacing={[4, 6, 8, 10]}
      >
        {filteredItems.map((item) => ItemCard(item))}
      </SimpleGrid>
    </>
  );
}
