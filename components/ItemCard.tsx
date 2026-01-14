import {
  Box,
  Button,
  Flex,
  Image,
  Link,
  AspectRatio,
  useColorModeValue,
  Circle,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { ItemCardProps } from "../types";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@chakra-ui/react";
import { useCallback, useMemo, memo } from "react";
import { FaCartArrowDown } from "react-icons/fa";
import { cardStyles, buttonColors } from "@/styles/designTokens";

const ItemCard = memo(function ItemCard({
  item,
  availableAmount,
}: ItemCardProps) {
  const {
    addToCart,
    state: { items: cartItems },
  } = useCart();
  const toast = useToast();

  const amountInCart = useMemo(
    () => cartItems.find((cartItem) => cartItem.id === item.id)?.amount ?? 0,
    [cartItems, item.id]
  );

  const amountLeft = useMemo(
    () => availableAmount - amountInCart,
    [availableAmount, amountInCart]
  );

  const canTakeMoreItems = useMemo(() => amountLeft > 0, [amountLeft]);

  const handleAddToCart = useCallback(() => {
    addToCart({
      id: item.id,
      name: item.name,
      amount: amountInCart + 1,
    });
    toast({
      title: "Lisättiin kama",
      description: `${item.name} lisätty ostoskoriin`,
      status: "success",
      duration: 1500,
      isClosable: true,
    });
  }, [addToCart, item.id, item.name, amountInCart, toast]);

  const bgColor = useColorModeValue("white", "gray.800");

  return (
    <Box
      bg={bgColor}
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
          src={item.image}
          alt={`Picture of ${item.name}`}
          roundedTop="lg"
          objectFit="cover"
          objectPosition="center"
          fallbackSrc="https://placehold.co/500x300"
        />
      </AspectRatio>

      <Box>
        <Flex mt={2} justifyContent="space-between" alignContent="center">
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
            <Link as={NextLink} href={"/item/" + item.id}>
              {item.name}
            </Link>
          </Box>
        </Flex>

        <Box fontSize="md" fontWeight="semibold" as="h5" mt={2}>
          Saatavilla: {amountLeft} / {item.amount} kpl
        </Box>

        <Box fontSize="md" fontWeight="semibold" as="h5" mt={2}>
          {item.categories.map((cat) => cat.name).join(", ")}
        </Box>

        <Button
          onClick={handleAddToCart}
          colorScheme={buttonColors.primary}
          width="full"
          mt={4}
          disabled={!canTakeMoreItems}
        >
          {canTakeMoreItems ? "Lisää" : "Ei saatavilla"}
          {canTakeMoreItems && <FaCartArrowDown />}
        </Button>
        <Circle
          position="absolute"
          right="-12px"
          top="-12px"
          size="24px"
          bg="red.500"
          color="white"
          display={amountInCart > 0 ? "flex" : "none"}
          fontSize="sm"
          fontWeight="bold"
          alignItems="center"
          justifyContent="center"
          boxShadow="md"
        >
          {amountInCart}
        </Circle>
      </Box>
    </Box>
  );
});

export default ItemCard;
