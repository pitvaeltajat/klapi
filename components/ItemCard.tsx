import {
  Box,
  Button,
  Flex,
  Image,
  Link,
  AspectRatio,
  useColorModeValue,
  Circle,
  IconButton,
  InputGroup,
  InputLeftAddon,
  InputRightAddon,
  Input,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { ItemCardProps } from "../types";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@chakra-ui/react";
import { useCallback, useMemo, memo } from "react";
import { FaCartArrowDown, FaPlus, FaMinus } from "react-icons/fa";

const ItemCard = memo(function ItemCard({
  item,
  availableAmount,
}: ItemCardProps) {
  const {
    addToCart,
    incrementAmount,
    decrementAmount,
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
  }, [addToCart, item.id, item.name, amountInCart, toast]);

  const handleIncrement = useCallback(() => {
    incrementAmount(item.id);
  }, [incrementAmount, item.id]);

  const handleDecrement = useCallback(() => {
    decrementAmount(item.id);
  }, [decrementAmount, item.id]);

  const bgColor = useColorModeValue("white", "gray.800");

  return (
    <Box
      bg={bgColor}
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
            noOfLines={1}
            title={item.name}
            _hover={{ textDecoration: "underline" }}
          >
            <Link as={NextLink} href={"/item/" + item.id}>
              {item.name}
            </Link>
          </Box>
        </Flex>

        <Box fontSize="l" fontWeight="semibold" as="h5">
          Vapaana: {amountLeft} / {item.amount} kpl
        </Box>

        <Box fontSize="l" fontWeight="semibold" as="h5">
          {item.categories.map((cat) => cat.name).join(", ")}
        </Box>

        {amountInCart > 0 ? (
          <InputGroup size="md" mt={4}>
            <InputLeftAddon width="20%" padding={0}>
              <IconButton
                icon={<FaMinus />}
                aria-label="decrement"
                onClick={handleDecrement}
                width="100%"
                height="100%"
              />
            </InputLeftAddon>
            <Input
              value={amountInCart}
              readOnly
              textAlign="center"
              fontWeight="bold"
            />
            <InputRightAddon width="20%" padding={0}>
              <IconButton
                icon={<FaPlus />}
                aria-label="increment"
                onClick={handleIncrement}
                width="100%"
                height="100%"
                isDisabled={!canTakeMoreItems}
              />
            </InputRightAddon>
          </InputGroup>
        ) : (
          <Button
            onClick={handleAddToCart}
            colorScheme="blue"
            width="full"
            mt={4}
            isDisabled={!canTakeMoreItems}
          >
            {canTakeMoreItems ? "Lisää" : "Ei saatavilla"}
            {canTakeMoreItems && <FaCartArrowDown />}
          </Button>
        )}
      </Box>
    </Box>
  );
});

export default ItemCard;
