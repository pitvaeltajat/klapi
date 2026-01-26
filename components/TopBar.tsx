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
  Text,
  Tbody,
  Tr,
  Td,
  Link,
  Container,
  Circle,
  Progress,
  useColorModeValue,
  Divider,
  Switch,
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Button,
  HStack,
  PinInput,
  PinInputField,
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
  const { data: session, update } = useSession();
  // Tarkista admin-oikeuden vanhentuminen heti mountissa (esim. välilehden uudelleenavaus)
  useEffect(() => {
    if (
      session?.user &&
      session.user.group === 'ADMIN' &&
      session.user.adminExpiry &&
      Date.now() >=
        (typeof session.user.adminExpiry === 'string'
          ? Date.parse(session.user.adminExpiry)
          : session.user.adminExpiry)
    ) {
      update({ user: { ...session.user, group: 'KIOSK', adminExpiry: null } });
    }
  }, [session?.user, update]);
  const [isNavigating, setIsNavigating] = useState(false);
  const role = session?.user?.group;
  const [adminSwitchLoading, setAdminSwitchLoading] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  // Helper to get effective group and expiry
  const effectiveGroup = session?.user?.group;
  const [expiry, setExpiry] = useState<number | null>(null);
  const [remaining, setRemaining] = useState<number>(0);

  // Read expiry from session if present
  useEffect(() => {
    if (session?.user && 'adminExpiry' in session.user && session.user.adminExpiry) {
      const exp =
        typeof session.user.adminExpiry === 'string'
          ? Date.parse(session.user.adminExpiry)
          : session.user.adminExpiry;
      setExpiry(exp);
    } else {
      setExpiry(null);
    }
  }, [session?.user]);

  // Countdown timer
  useEffect(() => {
    if (!expiry || effectiveGroup !== 'ADMIN') {
      setRemaining(0);
      return;
    }
    const update = () => {
      setRemaining(Math.max(0, Math.floor((expiry - Date.now()) / 1000)));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiry, effectiveGroup]);
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Handle switch toggle
  const handleAdminSwitch = async (checked: boolean) => {
    if (checked) {
      setPinDialogOpen(true);
      setPinInput('');
      setPinError('');
    } else {
      setAdminSwitchLoading(true);
      await update({ user: { ...session?.user, group: 'KIOSK', adminExpiry: null } });
      setAdminSwitchLoading(false);
    }
  };

  const comparePins = async (inputPin: string) => {
    return await fetch('/api/auth/validatePin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pin: inputPin, userId: session?.user?.id }),
    })
      .then((res) => res.json())
      .then((data) => data.isValidPin);
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await comparePins(pinInput)) {
      setAdminSwitchLoading(true);
      const expiryDate = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now
      await update({
        user: { ...session?.user, group: 'ADMIN', adminExpiry: expiryDate.toISOString() },
      });
      setPinDialogOpen(false);
      setPinError('');
      setAdminSwitchLoading(false);
    } else {
      setPinError('Väärä PIN-koodi');
    }
  };

  // Auto-revert to KIOSK when timer expires
  useEffect(() => {
    let timeout: NodeJS.Timeout | null = null;
    function checkAndRevert() {
      if (effectiveGroup === 'ADMIN' && expiry && Date.now() >= expiry) {
        update({ user: { ...session?.user, group: 'KIOSK', adminExpiry: null } });
      }
    }
    if (effectiveGroup === 'ADMIN' && expiry && Date.now() < expiry) {
      timeout = setTimeout(() => {
        update({ user: { ...session?.user, group: 'KIOSK', adminExpiry: null } });
      }, expiry - Date.now());
      document.addEventListener('visibilitychange', checkAndRevert);
    }
    return () => {
      if (timeout) clearTimeout(timeout);
      document.removeEventListener('visibilitychange', checkAndRevert);
    };
  }, [effectiveGroup, expiry, session, update]);

  const { isOpen, onOpen, onClose } = useDisclosure();

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

              <Box
                _hover={{ transform: 'scale(1.05)' }}
                transition="transform 0.2s"
                aria-label={'KLAPI'}
                fontWeight="semibold"
                lineHeight="1"
                fontSize="2xl"
                letterSpacing="0.02em"
                display="flex"
                alignItems="center"
              >
                <Link as={NextLink} href="/">
                  KLAPI
                </Link>
              </Box>
              {/* ADMIN/KIOSK switch for KIOSK users and ADMIN (if elevated) */}
              {session && (role === 'KIOSK' || (role === 'ADMIN' && session.user.adminExpiry)) && (
                <Box ml={4} display="flex" alignItems="center">
                  <Text fontSize="sm" color="white" mr={2}>
                    ADMIN
                  </Text>
                  <Switch
                    isChecked={effectiveGroup === 'ADMIN'}
                    onChange={(e) => handleAdminSwitch(e.target.checked)}
                    colorScheme="green"
                    size="md"
                    aria-label="Vaihda admin-oikeudet"
                  />
                  {effectiveGroup === 'ADMIN' && expiry && (
                    <Text fontSize="xs" ml={2} minW="60px">
                      {Math.floor(remaining / 60)}:{(remaining % 60).toString().padStart(2, '0')}
                    </Text>
                  )}
                </Box>
              )}
            </Flex>

            <AlertDialog
              isOpen={pinDialogOpen}
              leastDestructiveRef={cancelRef}
              onClose={() => setPinDialogOpen(false)}
            >
              <AlertDialogOverlay>
                <AlertDialogContent>
                  <AlertDialogHeader fontSize="lg" fontWeight="bold">
                    Anna admin-PIN
                  </AlertDialogHeader>
                  <form onSubmit={handlePinSubmit}>
                    <AlertDialogBody>
                      <HStack justify="center">
                        <PinInput type="number" value={pinInput} onChange={setPinInput}>
                          <PinInputField />
                          <PinInputField />
                          <PinInputField />
                          <PinInputField />
                        </PinInput>
                      </HStack>
                      {pinError && (
                        <Text color="red.500" mt={2}>
                          {pinError}
                        </Text>
                      )}
                    </AlertDialogBody>
                    <AlertDialogFooter>
                      <Button
                        ref={cancelRef}
                        onClick={() => setPinDialogOpen(false)}
                        colorScheme={'gray'}
                      >
                        Peruuta
                      </Button>
                      <Button
                        colorScheme="blue"
                        type="submit"
                        ml={3}
                        isDisabled={adminSwitchLoading}
                      >
                        Korota adminiksi
                      </Button>
                    </AlertDialogFooter>
                  </form>
                </AlertDialogContent>
              </AlertDialogOverlay>
            </AlertDialog>
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
              <Link as={NextLink} href="/item/announcements" fontWeight="medium">
                Ilmoitukset
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
                  <Link as={NextLink} href="/admin/reports" fontWeight="medium">
                    Raportit
                  </Link>
                  <Link as={NextLink} href="/admin" fontWeight="medium">
                    Admin
                  </Link>
                </>
              )}
              <Box display="flex" alignItems="center" position="relative">
                <Link as={NextLink} href="/account" fontWeight="medium" mr={6}>
                  Oma tili
                </Link>
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

                  <Tr>
                    <Td colSpan={1} p={0}>
                      <Divider />
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
                        Kamat
                      </Link>
                    </Td>
                  </Tr>
                  <Tr>
                    <Td>
                      <Link as={NextLink} href="/item/announcements" onClick={onClose}>
                        Ilmoitukset
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
                          <Link as={NextLink} href="/admin/reports" onClick={onClose}>
                            Raportit
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
