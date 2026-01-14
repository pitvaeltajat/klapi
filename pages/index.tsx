import React from "react";
import prisma from "../utils/prisma";
import DateSelector from "../components/DateSelector";
import KioskModeSelector from "../components/KioskModeSelector";
import KioskDateSelector from "../components/KioskDateSelector";
import {
  Box,
  Heading,
  Input,
  InputGroup,
  InputRightElement,
  Button,
  Wrap,
  WrapItem,
  Text,
  Link,
  useDisclosure,
  Container,
} from "@chakra-ui/react";
import { FaSearch } from "react-icons/fa";
import AllItems from "./productlist";
import type { GetServerSideProps } from "next";
import { Item, Category, Loan, Reservation, ItemType } from "@prisma/client";
import { useDates } from "@/contexts/DatesContext";
import { useSession } from "next-auth/react";
import { useCart } from "@/contexts/CartContext";
import CustomItemDialog from "../components/CustomItemDialog";
import {
  spacing,
  buttonColors,
  containerMaxWidth,
  headingSizes,
} from "@/styles/designTokens";

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
  const { state: cart } = useCart();

  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState("");

  const isKioskMode = session?.user?.group === "KIOSK";

  const { open, onOpen, onClose } = useDisclosure();

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
    })
    .filter((item) => {
      return item.type == ItemType.normal;
    });

  const renderSearchAndCategories = () => (
    <>
      <Box mb={spacing.elementSpacing}>
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
      </Box>
      <Box mb={spacing.sectionSpacing}>
        <Wrap gap={spacing.tightSpacing}>
          <WrapItem key="all">
            <Button
              onClick={() => setCategory("")}
              variant={category === "" ? "solid" : "outline"}
              colorScheme={
                category === "" ? buttonColors.primary : buttonColors.secondary
              }
            >
              Kaikki
            </Button>
          </WrapItem>
          {categories.map((cat) => (
            <WrapItem key={cat.id}>
              <Button
                onClick={() => setCategory(cat.name)}
                variant={category === cat.name ? "solid" : "outline"}
                colorScheme={
                  category === cat.name
                    ? buttonColors.primary
                    : buttonColors.secondary
                }
              >
                {cat.name}
              </Button>
            </WrapItem>
          ))}
        </Wrap>
      </Box>
    </>
  );

  const renderItemsList = () => (
    <>
      <Box mb={spacing.elementSpacing}>
        <Text>
          Jos haluamaasi kamaa ole lisätty valikoimaan klikkaa{" "}
          <Link color="teal.500" onClick={onOpen}>
            tästä
          </Link>
        </Text>
      </Box>
      <CustomItemDialog isOpen={open} onClose={onClose} />
      {filteredItems.length > 0 ? (
        <AllItems items={filteredItems} categories={categories} />
      ) : (
        <Heading
          textAlign="center"
          mt={spacing.elementSpacing}
          size={headingSizes.subsection}
        >
          Ei hakutuloksia :(
        </Heading>
      )}
    </>
  );

  return (
    <Container maxW={containerMaxWidth} {...spacing.containerPadding}>
      {isKioskMode ? (
        <>
          {!dates.datesSet ? (
            <KioskModeSelector />
          ) : (
            <>
              <KioskDateSelector />
              {renderSearchAndCategories()}
              {renderItemsList()}
            </>
          )}
        </>
      ) : (
        <>
          {dates.datesSet ? (
            <>
              <DateSelector />
              {renderSearchAndCategories()}
              {renderItemsList()}
            </>
          ) : (
            <DateSelector />
          )}
        </>
      )}
    </Container>
  );
}
