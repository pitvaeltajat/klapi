import {
  Flex,
  Box,
  IconButton,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerOverlay,
  TableContainer,
  Table,
  Tbody,
  Tr,
  Td,
  Link,
  Container,
  Circle,
  useBreakpointValue,
  Progress,
  useColorModeValue,
  Divider,
} from '@chakra-ui/react';
import { FaBars } from 'react-icons/fa';
import NextLink from 'next/link';
import { useSession } from 'next-auth/react';
import { useDisclosure } from '@chakra-ui/react';
import { ReactNode, useEffect, useState } from 'react';
import { useCart } from '@/contexts/CartContext';
import { useDates } from '@/contexts/DatesContext';
import { useRouter } from 'next/router';

export default function TopBar({ children }: { children: ReactNode }) {
  const [isNavigating, setIsNavigating] = useState(false);
  const { data: session } = useSession();
  const role = session?.user?.group;
  const { isOpen, onOpen, onClose } = useDisclosure();
  const isDesktop = useBreakpointValue({ base: false, md: true }) ?? false;

  const headerBg = useColorModeValue('rgba(66,131,209,0.9)', 'rgba(26,32,44,0.95)');

  const router = useRouter();

  useEffect(() => {
    const handleStart = () => setIsNavigating(true);
    const handleComplete = () => setIsNavigating(false);

    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleComplete);
    router.events.on('routeChangeError', handleComplete);

    return () => {
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleComplete);
      router.events.off('routeChangeError', handleComplete);
    };
  }, [router]);

  const {
    state: { items },
  } = useCart();
  const { setBrowseMode, setDatesSet } = useDates();
  const totalItems = items.reduce((sum, item) => sum + item.amount, 0);

  const handleBrowseClick = () => {
    setBrowseMode(true);
    setDatesSet(false);
    if (router.pathname !== '/') {
      router.push('/');
    }
  };

  const handleReserveClick = () => {
    setBrowseMode(false);
  };

  return (
    <>
      <Box
        as="header"
        position="fixed"
        top={0}
        left={0}
        right={0}
        bg={headerBg}
        backdropFilter="auto"
        backdropBlur="4px"
        zIndex={1000}
        boxShadow="sm"
      >
        <Container maxW="container.xl" px={4}>
          <Flex h="4rem" align="center" justify="space-between" color="white">
            <Flex align="center" gap={4}>
              {session && (
                <IconButton
                  aria-label="open menu"
                  icon={<FaBars />}
                  colorScheme="whiteAlpha"
                  onClick={isOpen ? onClose : onOpen}
                  display={['block', 'block', 'none']}
                  variant="ghost"
                  color="white"
                  _hover={{ bg: 'whiteAlpha.300' }}
                  _active={{ bg: 'whiteAlpha.400' }}
                />
              )}

              <Box>
                <Link
                  as={NextLink}
                  href="/"
                  _hover={{ textDecoration: 'none' }}
                  aria-label="KLAPI"
                  tabIndex={0}
                >
                  <Box
                    as="span"
                    display="inline-block"
                    fontWeight="semibold"
                    lineHeight="1"
                    fontSize="2xl"
                    letterSpacing="0.02em"
                  >
                    KLAPI
                  </Box>
                </Link>
              </Box>
            </Flex>

            {session && (
              <Flex gap={6} align="center" display={['none', 'none', 'flex']} height="30%">
                <Link as={NextLink} href="/" fontWeight="medium" onClick={handleReserveClick}>
                  Lainaa
                </Link>
                <Link as={NextLink} href="/kiosk/return" fontWeight="medium">
                  Palauta
                </Link>
                <Divider orientation="vertical" />
                <Link
                  as={router.pathname === '/' ? 'button' : NextLink}
                  href={router.pathname === '/' ? undefined : '/'}
                  onClick={handleBrowseClick}
                  fontWeight="medium"
                >
                  Kamat
                </Link>
                {(role === 'ADMIN' || role === 'KIOSK') && (
                  <Link as={NextLink} href="/loan" fontWeight="medium">
                    Varaukset
                  </Link>
                )}
                {role === 'ADMIN' && (
                  <>
                    <Link as={NextLink} href="/admin/boxes" fontWeight="medium">
                      Laatikot
                    </Link>
                    <Link as={NextLink} href="/admin" fontWeight="medium">
                      Admin
                    </Link>
                  </>
                )}
                <Link as={NextLink} href="/account" fontWeight="medium">
                  Oma tili
                </Link>
                <Box position="relative">
                  {children}
                  {totalItems > 0 && (
                    <Circle
                      position="absolute"
                      right="-12px"
                      top="-12px"
                      marginTop="5px"
                      size="24px"
                      bg="red.500"
                      color="white"
                      fontSize="sm"
                      fontWeight="bold"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      boxShadow="md"
                    >
                      {totalItems}
                    </Circle>
                  )}
                </Box>
              </Flex>
            )}

            {session && (
              <Box display={['block', 'block', 'none']} position="relative">
                {children}
                {totalItems > 0 && (
                  <Circle
                    position="absolute"
                    right="-12px"
                    top="-12px"
                    size="24px"
                    bg="red.500"
                    color="white"
                    fontSize="sm"
                    fontWeight="bold"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    boxShadow="md"
                  >
                    {totalItems}
                  </Circle>
                )}
              </Box>
            )}
          </Flex>
        </Container>
      </Box>
      {isNavigating && (
        <Progress
          size="xs"
          isIndeterminate
          position="fixed"
          top="4rem"
          left={0}
          right={0}
          zIndex={999}
          colorScheme="blue"
        />
      )}
      <Box h="4rem" />{' '}
      <Drawer placement="top" onClose={onClose} isOpen={isOpen}>
        <DrawerOverlay />
        <DrawerContent>
          <DrawerBody pt="4rem">
            <TableContainer>
              <Table variant="simple">
                <Tbody>
                  <Tr>
                    <Td>
                      <Link
                        as={NextLink}
                        href="/"
                        onClick={() => {
                          handleReserveClick();
                          onClose();
                        }}
                      >
                        Lainaa
                      </Link>
                    </Td>
                  </Tr>
                  <Tr>
                    <Td>
                      <Link as={NextLink} href="/kiosk/return" onClick={onClose}>
                        Palauta
                      </Link>
                    </Td>
                  </Tr>

                  <Divider />
                  <Tr>
                    <Td>
                      <Link
                        as={router.pathname === '/' ? 'button' : NextLink}
                        href={router.pathname === '/' ? undefined : '/'}
                        onClick={() => {
                          handleBrowseClick();
                          onClose();
                        }}
                      >
                        Kamat
                      </Link>
                    </Td>
                  </Tr>
                  {(role === 'ADMIN' || role === 'KIOSK') && (
                    <Tr>
                      <Td>
                        <Link as={NextLink} href="/loan" onClick={onClose}>
                          Varaukset
                        </Link>
                      </Td>
                    </Tr>
                  )}
                  {role === 'ADMIN' && (
                    <>
                      <Tr>
                        <Td>
                          <Link as={NextLink} href="/admin/boxes" onClick={onClose}>
                            Laatikot
                          </Link>
                        </Td>
                      </Tr>
                      <Tr>
                        <Td>
                          <Link as={NextLink} href="/admin" onClick={onClose}>
                            Admin
                          </Link>
                        </Td>
                      </Tr>
                    </>
                  )}
                  <Tr>
                    <Td>
                      <Link as={NextLink} href="/account" onClick={onClose}>
                        Oma tili
                      </Link>
                    </Td>
                  </Tr>
                </Tbody>
              </Table>
            </TableContainer>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
}
