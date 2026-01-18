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
} from '@chakra-ui/react';
import { FaBars } from 'react-icons/fa';
import NextLink from 'next/link';
import { useSession } from 'next-auth/react';
import { useDisclosure } from '@chakra-ui/react';
import { ReactNode, useState, useRef, useEffect } from 'react';
import { useCart } from '@/contexts/CartContext';
import { useDates } from '@/contexts/DatesContext';
import { useRouter } from 'next/router';

export default function TopBar({ children }: { children: ReactNode }) {
  const [titleHover, setTitleHover] = useState(false);
  const [revealWords, setRevealWords] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const revealDelayRef = useRef<number | null>(null);
  const { data: session } = useSession();
  const role = session?.user?.group;
  const { isOpen, onOpen, onClose } = useDisclosure();
  const isDesktop = useBreakpointValue({ base: false, md: true }) ?? false;

  const headerBg = useColorModeValue('rgba(66,131,209,0.9)', 'rgba(26,32,44,0.95)');

  const router = useRouter();

  useEffect(() => {
    if (!isDesktop) {
      setTitleHover(false);
      if (revealDelayRef.current) window.clearTimeout(revealDelayRef.current);
      setRevealWords(false);
    }
  }, [isDesktop]);

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

              <Box
                onMouseEnter={() => {
                  if (!isDesktop) return;
                  setTitleHover(true);
                  if (revealDelayRef.current) window.clearTimeout(revealDelayRef.current);
                  revealDelayRef.current = window.setTimeout(() => {
                    setRevealWords(true);
                  }, 2000);
                }}
                onMouseLeave={() => {
                  if (!isDesktop) return;
                  setTitleHover(false);
                  if (revealDelayRef.current) {
                    window.clearTimeout(revealDelayRef.current);
                    revealDelayRef.current = null;
                  }
                  setRevealWords(false);
                }}
                onFocus={() => {
                  if (!isDesktop) return;
                  setTitleHover(true);
                  if (revealDelayRef.current) window.clearTimeout(revealDelayRef.current);
                  revealDelayRef.current = window.setTimeout(() => {
                    setRevealWords(true);
                  }, 2000);
                }}
                onBlur={() => {
                  if (!isDesktop) return;
                  setTitleHover(false);
                  if (revealDelayRef.current) {
                    window.clearTimeout(revealDelayRef.current);
                    revealDelayRef.current = null;
                  }
                  setRevealWords(false);
                }}
              >
                <Link
                  as={NextLink}
                  href="/"
                  _hover={{ textDecoration: 'none' }}
                  
                  aria-label={
                    titleHover || revealWords
                      ? 'Kaluston Lainaus Applikaatio Pitvalaisten Ilmeiseen tarpeeseen'
                      : 'KLAPI'
                  }
                  tabIndex={0}
                >
                  <Box
                    display="flex"
                    alignItems="center"
                    gap={revealWords ? '0.4ch' : '0.8ch'}
                    as="span"
                    fontSize="lg"
                  >
                    {!revealWords ? (
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
                    ) : (
                      [
                        'Kaluston',
                        'Lainaus',
                        'Applikaatio',
                        'Pitvalaisten',
                        'Ilmeiseen tarpeeseen',
                      ].map((word, idx) => {
                        const expanded = `${Math.max(word.length + 1, 5)}ch`;
                        return (
                          <Box
                            as="span"
                            key={idx}
                            overflow="hidden"
                            whiteSpace="nowrap"
                            transition="width 220ms cubic-bezier(.2,.8,.2,1), opacity 160ms"
                            width={expanded}
                            minW={'1.4ch'}
                            display="inline-flex"
                            alignItems="center"
                            justifyContent="flex-start"
                            textAlign="left"
                            fontWeight="semibold"
                            px={2}
                            letterSpacing="0.02em"
                          >
                            <Box
                              as="span"
                              display="inline-block"
                              transformOrigin="left center"
                              transition="transform 220ms"
                              fontSize={'lg'}
                              lineHeight="1"
                            >
                              {word}
                            </Box>
                          </Box>
                        );
                      })
                    )}
                  </Box>
                </Link>
              </Box>
            </Flex>

            {session && (
              <Flex gap={6} align="center" display={['none', 'none', 'flex']}>
                <Link as={NextLink} href="/" fontWeight="medium" onClick={handleReserveClick}>
                  Varaa
                </Link>
                <Link
                  as={router.pathname === '/' ? 'button' : NextLink}
                  href={router.pathname === '/' ? undefined : '/'}
                  onClick={handleBrowseClick}
                  fontWeight="medium"
                >
                  Selaa kamoja
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
                {role === 'KIOSK' && (
                  <Link as={NextLink} href="/kiosk/return" fontWeight="medium">
                    Palauta
                  </Link>
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
                        Varaa
                      </Link>
                    </Td>
                  </Tr>
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
                        Selaa kamoja
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
                  {role === 'KIOSK' && (
                    <Tr>
                      <Td>
                        <Link as={NextLink} href="/kiosk/return" onClick={onClose}>
                          Palauta
                        </Link>
                      </Td>
                    </Tr>
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
