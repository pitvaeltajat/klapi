import {
  Box,
  Button,
  Flex,
  Image,
  Link,
  AspectRatio,
  useColorModeValue,
  IconButton,
  InputGroup,
  InputLeftAddon,
  InputRightAddon,
  Input,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { ItemCardProps } from '../types';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@chakra-ui/react';
import { useCallback, useMemo, memo, MouseEvent } from 'react';
import { FaCartArrowDown, FaPlus, FaMinus } from 'react-icons/fa';
import { useRouter } from 'next/router';
import { LuTriangleAlert } from 'react-icons/lu';
import { useItemImage, usePlaceholder } from '../hooks/useItemImage';

const ItemCard = memo(function ItemCard({ item, availableAmount }: ItemCardProps) {
  const {
    addToCart,
    incrementAmount,
    decrementAmount,
    state: { items: cartItems },
  } = useCart();
  const toast = useToast();
  const router = useRouter();
  const imageSrc = useItemImage(item.id);
  const placeholder = usePlaceholder();

  const amountInCart = useMemo(
    () => cartItems.find((cartItem) => cartItem.id === item.id)?.amount ?? 0,
    [cartItems, item.id],
  );

  const amountLeft = useMemo(() => availableAmount - amountInCart, [availableAmount, amountInCart]);

  const canTakeMoreItems = useMemo(() => amountLeft > 0, [amountLeft]);

  const handleAddToCart = useCallback(() => {
    addToCart({
      id: item.id,
      name: item.name,
      amount: amountInCart + 1,
    });
    toast({
      title: 'Lisättiin kama',
      description: `${item.name} lisätty ostoskoriin`,
      status: 'success',
      duration: 1500,
      isClosable: true,
    });
  }, [addToCart, item.id, item.name, amountInCart, toast]);

  const handleIncrement = useCallback(() => {
    incrementAmount(item.id);
  }, [incrementAmount, item.id]);

  const handleDecrement = useCallback(() => {
    decrementAmount(item.id);
  }, [decrementAmount, item.id]);

  const handleCardClick = useCallback(() => {
    router.push(`/item/${item.id}`);
  }, [router, item.id]);

  const stopPropagation = useCallback((e: MouseEvent) => {
    e.stopPropagation();
  }, []);

  const bgColor = useColorModeValue('white', 'gray.800');

  return (
    <Box
      bg={bgColor}
      maxW="sm"
      borderWidth="1px"
      rounded="lg"
      shadow="lg"
      position="relative"
      cursor="pointer"
      onClick={handleCardClick}
      _hover={{
        shadow: '2xl',
        transform: 'scale(1.01)',
        transition: 'all 0.2s',
        zIndex: 1,
      }}
    >
      <AspectRatio ratio={5 / 3}>
        <Image
          src={imageSrc}
          alt={`Picture of ${item.name}`}
          roundedTop="lg"
          objectFit="cover"
          objectPosition="center"
          fallbackSrc={placeholder}
        />
      </AspectRatio>

      <Box margin={'1.5em'} marginTop={'0.5em'}>
        <Flex mt="1" justifyContent="space-between" alignContent="center">
          <Text
            fontSize="2xl"
            fontWeight="semibold"
            lineHeight="tight"
            isTruncated
            overflow="hidden"
            noOfLines={1}
            title={item.name}
          >
            {item.name}
          </Text>
        </Flex>

        <Box fontSize="l" fontWeight="semibold" as="h5">
          Vapaana: {amountLeft} / {item.amount} kpl
        </Box>

        <Box fontSize="l" fontWeight="semibold" as="h5" minH="1.5em">
          {item.categories.map((cat) => cat.name).join(', ')}
        </Box>

        {Array.isArray(item.announcements) &&
          item.announcements.length > 0 &&
          item.announcements.map((announcement) => (
            <Box
              key={announcement.id}
              fontSize="md"
              fontWeight="semibold"
              color="red.500"
              mt={2}
              onClick={stopPropagation}
            >
              <Link
                as={NextLink}
                href={'/item/announcements'}
                display="flex"
                alignItems="center"
                gap={1}
              >
                <LuTriangleAlert style={{ marginRight: '0.4em' }} />
                Sisältää ilmoituksen
              </Link>
            </Box>
          ))}

        <Box onClick={stopPropagation}>
          {amountInCart > 0 ? (
            <Flex mt={4}>
              <IconButton
                icon={<FaMinus />}
                aria-label="decrement"
                onClick={handleDecrement}
                borderRightRadius={0}
                size="md"
              />
              <Input
                value={amountInCart}
                readOnly
                textAlign="center"
                fontWeight="bold"
                userSelect="none"
                pointerEvents="none"
                borderRadius={0}
                borderX={0}
              />
              <IconButton
                icon={<FaPlus />}
                aria-label="increment"
                onClick={handleIncrement}
                borderLeftRadius={0}
                size="md"
                isDisabled={!canTakeMoreItems}
              />
            </Flex>
          ) : (
            <Button
              onClick={handleAddToCart}
              colorScheme="blue"
              width="full"
              mt={4}
              isDisabled={!canTakeMoreItems}
              gap={2}
            >
              {canTakeMoreItems ? 'Lisää' : 'Ei saatavilla'}
              {canTakeMoreItems && <FaCartArrowDown />}
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
});

export default ItemCard;
