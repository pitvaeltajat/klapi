import {
  Heading,
  Link,
  Stack,
  Input,
  InputGroup,
  InputRightElement,
  Box,
  Flex,
  Image,
  SimpleGrid,
  Select,
  AspectRatio,
  Container,
  VStack,
} from "@chakra-ui/react";
import prisma from "../../utils/prisma";
import NextLink from "next/link";
import { useState } from "react";
import { FaSearch } from "react-icons/fa";
import { Item, Category, Loan, Reservation } from "@prisma/client";
import {
  cardStyles,
  headingSizes,
  spacing,
  containerMaxWidth,
} from "@/styles/designTokens";

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
  items = items.sort((a, b) => {
    return a.name.localeCompare(b.name);
  });

  categories = categories.sort((a, b) => {
    return a.name.localeCompare(b.name);
  });

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
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

  const ItemCard = (item: ItemWithRelations) => {
    return (
      <Box w="full" alignItems="center" justifyContent="center" key={item.id}>
        <Box
          bg="white"
          maxW="sm"
          {...cardStyles.compact}
          position="relative"
          _hover={{
            ...cardStyles.hover,
            transform: "scale(1.01)",
            transition: "all 0.2s",
            zIndex: 1,
          }}
        >
          <AspectRatio ratio={5 / 3}>
            <Image
              src={item.image ?? "https://placehold.co/500x300"}
              alt={`Picture of ${item.name}`}
              roundedTop="lg"
              objectFit="cover"
              objectPosition="center"
              fallbackSrc="https://placehold.co/500x300"
            />
          </AspectRatio>

          <Box p={4}>
            <Flex mt="1" justifyContent="space-between" alignContent="center">
              <Box
                fontSize="2xl"
                fontWeight="semibold"
                as="h4"
                lineHeight="tight"
                isTruncated
                overflow="hidden"
                noOfLines={1}
                title={item.name}
                _hover={{ textDecoration: "underline" }}
              >
                <NextLink href={"/item/" + item.id} passHref legacyBehavior>
                  <Link>{item.name}</Link>
                </NextLink>
              </Box>
            </Flex>
            <Box fontSize="md" fontWeight="semibold" as="h5" mt={2}>
              {item.amount} kpl
            </Box>
            <Box fontSize="md" fontWeight="semibold" as="h5" mt={2}>
              {item.categories.map((cat) => cat.name).join(", ")}
            </Box>
          </Box>
        </Box>
      </Box>
    );
  };

  return (
    <Container maxW={containerMaxWidth} {...spacing.containerPadding}>
      <VStack gap={spacing.sectionSpacing} align="stretch">
        <Heading as="h1" size={headingSizes.pageTitle}>
          Kaikki kamat
        </Heading>
        <Stack direction="row" gap={spacing.elementSpacing}>
          <InputGroup width={"fit-content"}>
            <Input
              placeholder="Hae kamoja"
              value={search}
              onChange={handleChange}
            />
            <InputRightElement>
              <FaSearch />
            </InputRightElement>
          </InputGroup>
        </Stack>
        <Box>
          <Heading
            as="h2"
            size={headingSizes.subsection}
            mb={spacing.tightSpacing}
          >
            Kategoriat
          </Heading>
          <Select
            width={"fit-content"}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Kaikki</option>
            {categories.map((category) => (
              <option key={category.id} value={category.name}>
                {category.name}
              </option>
            ))}
          </Select>
        </Box>

        <SimpleGrid
          columns={{ base: 1, sm: 2, md: 2, lg: 3, xl: 4 }}
          gap={[4, 6, 8, 10]}
        >
          {filteredItems.map((item) => ItemCard(item))}
        </SimpleGrid>
      </VStack>
    </Container>
  );
}
