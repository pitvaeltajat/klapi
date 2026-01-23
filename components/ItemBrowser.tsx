import React from 'react';
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
  Flex,
  Icon,
  Select,
  useColorModeValue,
} from '@chakra-ui/react';
import { FaSearch, FaInfoCircle, FaTimes } from 'react-icons/fa';
import AllItems from '../pages/productlist';
import { Item, Category, Loan, Reservation, Announcement } from '@prisma/client';
import CustomItemDialog from './CustomItemDialog';

interface ItemWithRelations extends Item {
  categories: Category[];
  reservations?: (Reservation & { loan: Loan })[];
  announcements: Announcement[];
}

interface ItemBrowserProps {
  items: ItemWithRelations[];
  categories: Category[];
  showCustomItemLink?: boolean;
  renderItems?: (items: ItemWithRelations[]) => React.ReactNode;
}

export default function ItemBrowser({
  items,
  categories,
  showCustomItemLink = false,
  renderItems,
}: ItemBrowserProps) {
  const [search, setSearch] = React.useState('');
  const [category, setCategory] = React.useState('');
  const { isOpen, onOpen, onClose } = useDisclosure();

  const infoBg = useColorModeValue('blue.50', 'blue.900');
  const infoBorderColor = useColorModeValue('blue.400', 'blue.500');
  const infoIconColor = useColorModeValue('blue.500', 'blue.300');
  const linkColor = useColorModeValue('blue.600', 'blue.300');
  const linkHoverColor = useColorModeValue('blue.700', 'blue.200');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const filteredItems = items
    .filter((item) => {
      return item.name.toLowerCase().includes(search.toLowerCase());
    })
    .filter((item) => {
      if (category === '') {
        return true;
      } else {
        return item.categories.some((cat) => cat.name === category);
      }
    });

  return (
    <>
      <Box padding="4px">
        <InputGroup width={'fit-content'}>
          <Input
            placeholder="Hae kamoja"
            marginBottom={'1em'}
            value={search}
            onChange={handleChange}
          />
          <InputRightElement>
            {search ? (
              <FaTimes cursor="pointer" onClick={() => setSearch('')} aria-label="Tyhjennä haku" />
            ) : (
              <FaSearch />
            )}
          </InputRightElement>
        </InputGroup>
      </Box>
      <Box padding="2em" paddingLeft={0} display={{ base: 'none', md: 'block' }}>
        <Wrap padding="4px">
          <WrapItem key="all">
            <Button
              onClick={() => setCategory('')}
              variant={category === '' ? 'solid' : 'outline'}
              colorScheme={category === '' ? 'blue' : 'gray'}
            >
              Kaikki
            </Button>
          </WrapItem>

          {[...categories]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((cat) => (
              <WrapItem key={cat.id}>
                <Button
                  onClick={() => setCategory(category === cat.name ? '' : cat.name)}
                  variant={category === cat.name ? 'solid' : 'outline'}
                  colorScheme={category === cat.name ? 'blue' : 'gray'}
                >
                  {cat.name}
                </Button>
              </WrapItem>
            ))}
        </Wrap>
      </Box>
      <Box padding="2em" paddingLeft={0} display={{ base: 'block', md: 'none' }}>
        <Select
          width="100%"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          borderRadius="6px"
          borderColor="gray.300"
          placeholder="Kaikki"
        >
          {[...categories]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((cat) => (
              <option key={cat.id} value={cat.name}>
                {cat.name}
              </option>
            ))}
        </Select>
      </Box>
      {showCustomItemLink && (
        <>
          <Flex
            alignItems="center"
            gap={3}
            padding="1em"
            marginBottom="1em"
            bg={infoBg}
            borderRadius="md"
            borderLeft="4px solid"
            borderColor={infoBorderColor}
          >
            <Icon as={FaInfoCircle} color={infoIconColor} boxSize={5} />
            <Text fontSize="sm">
              Jos haluamaasi kamaa ei löydy,{' '}
              <Link
                color={linkColor}
                fontWeight="semibold"
                onClick={onOpen}
                textDecoration="underline"
                _hover={{ color: linkHoverColor }}
              >
                klikkaa tästä
              </Link>
            </Text>
          </Flex>
          <CustomItemDialog isOpen={isOpen} onClose={onClose} />
        </>
      )}
      {filteredItems.length > 0 ? (
        renderItems ? (
          renderItems(filteredItems)
        ) : (
          <AllItems items={filteredItems} categories={categories} />
        )
      ) : (
        <Heading textAlign="center" marginTop="1em">
          Ei hakutuloksia :(
        </Heading>
      )}
    </>
  );
}
