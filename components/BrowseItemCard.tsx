import { Box, Flex, Image, Link, AspectRatio, useColorModeValue } from '@chakra-ui/react';
import NextLink from 'next/link';
import { Item, Category, ItemType } from '@prisma/client';
import { getCompressedImageUrl } from '../utils/imageHelpers';

interface ItemWithCategories extends Item {
  categories: Category[];
  type: ItemType;
}

interface BrowseItemCardProps {
  item: ItemWithCategories;
}

export default function BrowseItemCard({ item }: BrowseItemCardProps) {
  return (
    <Box w="full" alignItems="center" justifyContent="center" key={item.id}>
      <Box
        bg={useColorModeValue('white', 'gray.800')}
        maxW="sm"
        borderWidth="1px"
        rounded="lg"
        shadow="lg"
        position="relative"
        _hover={{
          shadow: '2xl',
          transform: 'scale(1.01)',
          transition: 'all 0.2s',
          zIndex: 1,
        }}
      >
        <AspectRatio ratio={5 / 3}>
          <Image
            src={getCompressedImageUrl(item.id) ?? 'https://placehold.co/500x300'}
            alt={`Picture of ${item.name}`}
            roundedTop="lg"
            objectFit="cover"
            objectPosition="center"
            fallbackSrc="https://placehold.co/500x300"
          />
        </AspectRatio>

        <Box margin={'1.5em'} marginTop={'0.5em'}>
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
              _hover={{ textDecoration: 'underline' }}
            >
              <Link as={NextLink} href={'/item/' + item.id}>
                {item.name}
              </Link>
            </Box>
          </Flex>
          <Box fontSize="l" fontWeight="semibold" as="h5">
            {item.amount} kpl
          </Box>
          <Box fontSize="l" fontWeight="semibold" as="h5">
            {item.categories.map((cat) => cat.name).join(', ')}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
