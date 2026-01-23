import { Box, Flex, Image, Link, AspectRatio, useColorModeValue, Text } from '@chakra-ui/react';
import NextLink from 'next/link';
import { Item, Category, ItemType, Announcement } from '@prisma/client';
import { useItemImage, usePlaceholder } from '../hooks/useItemImage';
import { LuTriangleAlert } from 'react-icons/lu';

interface ItemWithCategories extends Item {
  categories: Category[];
  type: ItemType;
  announcements: Announcement[];
}

interface BrowseItemCardProps {
  item: ItemWithCategories;
}

export default function BrowseItemCard({ item }: BrowseItemCardProps) {
  const imageSrc = useItemImage(item.id);
  const placeholder = usePlaceholder();

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

          {Array.isArray(item.announcements) &&
            item.announcements.length > 0 &&
            item.announcements.map((announcement: Announcement) => (
              <Box key={announcement.id} fontSize="md" fontWeight="semibold" color="red.500" mt={2}>
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
        </Box>
      </Box>
    </Box>
  );
}
