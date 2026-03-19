import {
  Button,
  Drawer,
  DrawerBody,
  DrawerOverlay,
  DrawerFooter,
  DrawerHeader,
  DrawerContent,
  DrawerCloseButton,
  Stack,
  Box,
  FormLabel,
  Input,
  Flex,
  IconButton,
  Heading,
  useDisclosure,
  Textarea,
  Text,
  useColorModeValue,
} from '@chakra-ui/react';
import { useRef, useState, useEffect } from 'react';
import { FaPlus, FaMinus } from 'react-icons/fa';
import { IoMdAlert } from 'react-icons/io';
import SubmitConfirmation from './SubmitConfirmation';
import LoadingSpinner from './LoadingSpinner';
import LoanerAutocomplete from './LoanerAutocomplete';
import { useSession } from 'next-auth/react';
import { useCart } from '@/contexts/CartContext';
import { useDates } from '@/contexts/DatesContext';
import { useDelayedLoading } from '@/hooks/useDelayedLoading';

interface AvailabilityData {
  availabilities: Record<string, { available: number }>;
}

export default function CartDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const firstField = useRef<HTMLInputElement>(null);
  const { data: session } = useSession();
  const disabledInputBg = useColorModeValue('gray.100', 'gray.600');
  const requiredColor = useColorModeValue('red.500', 'red.300');
  const kioskInfoBg = useColorModeValue('gray.50', 'gray.700');
  const kioskInfoBorder = useColorModeValue('gray.200', 'gray.600');
  const {
    state: cart,
    incrementAmount,
    decrementAmount,
    setDescription,
    setLoaner,
    setUserId,
  } = useCart();
  const cartItems = cart.items;
  const { state: dates } = useDates();

  const ConfirmationDialog = useDisclosure();

  const startTime = dates.startDate;
  const endTime = dates.endDate;

  const StartDate = dates.startDate;
  const EndDate = dates.endDate;

  const [data, setData] = useState<AvailabilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const showLoading = useDelayedLoading(loading);

  const isAdmin = session?.user?.group === 'ADMIN';
  const isKiosk = session?.user?.group === 'KIOSK';

  const [hasInitializedLoaner, setHasInitializedLoaner] = useState(false);
  const [localDescription, setLocalDescription] = useState(cart.description);

  // Nollaa kuvaus kun ostoskori tyhjennetään resetCartilla
  useEffect(() => {
    if (cart.items.length === 0 && localDescription !== '') {
      setLocalDescription('');
    }
  }, [cart.items.length]);

  // Debounce description updates to context
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDescription(localDescription);
    }, 300);
    return () => clearTimeout(timeout);
  }, [localDescription, setDescription]);

  const [reportContent, setReportContent] = useState('');

  // Pre-fill loaner with current user's info (locked for regular users, editable for admins)
  // Only set once on initial load
  useEffect(() => {
    if (!isKiosk && session?.user && !hasInitializedLoaner) {
      const userDisplayName = session.user.email || session.user.name || '';
      setLoaner(userDisplayName);
      setUserId(session.user.id);
      setHasInitializedLoaner(true);
    }
  }, [session, isKiosk, setLoaner, setUserId, hasInitializedLoaner]);

  useEffect(() => {
    setLoading(true);

    fetch('/api/availability/getAvailabilities', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ StartDate, EndDate }),
    })
      .then((response) => response.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch((error) => {
        console.log(error);
        setLoading(false);
      });
  }, [StartDate, EndDate]);

  function getCartAmount(id: string): number {
    return cartItems.find((cartItem: { id: string; amount: number }) => cartItem.id === id) !==
      undefined
      ? cartItems.find((cartItem: { id: string; amount: number }) => cartItem.id === id)!.amount
      : 0;
  }

  if (loading || !data) {
    if (!showLoading) {
      return null;
    }
    return (
      <Drawer isOpen={isOpen} placement="right" size={{ base: 'full', md: 'md' }} onClose={onClose}>
        <DrawerOverlay />
        <DrawerContent display="flex" flexDirection="column" maxH="100dvh">
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px" flexShrink={0}>
            Ostoskori
          </DrawerHeader>
          <DrawerBody flex="1" minH={0}>
            <LoadingSpinner fullWidth />
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    );
  }

  const { availabilities } = data;

  const timeStringWithoutTimeZone = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${day}.${month}.${year} ${hours}:${minutes}`;
  };

  const isDescriptionValid = localDescription.trim().length > 0;

  return (
    <Drawer
      isOpen={isOpen}
      placement="right"
      size={{ base: 'full', md: 'md' }}
      initialFocusRef={firstField}
      onClose={onClose}
    >
      <DrawerOverlay />
      <DrawerContent display="flex" flexDirection="column" maxH="100dvh">
        <DrawerCloseButton />
        <DrawerHeader borderBottomWidth="1px" flexShrink={0}>
          Ostoskori
        </DrawerHeader>

        <DrawerBody overflow="auto" flex="1" minH={0}>
          <SubmitConfirmation
            isOpen={ConfirmationDialog.isOpen}
            onClose={ConfirmationDialog.onClose}
            closeDrawer={onClose}
            reportContent={reportContent}
            setReportContent={setReportContent}
          />
          <Stack spacing={1}>
            <Box>
              <FormLabel htmlFor="loaner">
                Lainaaja <Text as="span" color={requiredColor}>*</Text>
              </FormLabel>
              {isAdmin || isKiosk ? (
                <LoanerAutocomplete
                  value={cart.loaner || ''}
                  onChange={(value, userId) => {
                    setLoaner(value);
                    setUserId(userId);
                  }}
                  placeholder="Lainaajan nimi tai sähköposti (pakollinen)"
                  size="md"
                />
              ) : (
                <Input id="loaner" value={cart.loaner || ''} isDisabled bg={disabledInputBg} />
              )}
            </Box>
            <Box>
              <FormLabel htmlFor="description">
                Kuvaus <Text as="span" color={requiredColor}>*</Text>
              </FormLabel>
              <Input
                ref={firstField}
                id="description"
                name="description"
                placeholder="Kuvaus (pakollinen)"
                value={localDescription}
                onChange={(e) => setLocalDescription(e.target.value)}
                isRequired
                isInvalid={!isDescriptionValid && cart.items.length > 0}
              />
            </Box>
            <Box>
              <FormLabel htmlFor="startTime">Lainaus alkaa</FormLabel>
              <Input id="startTime" value={timeStringWithoutTimeZone(startTime)} readOnly />
            </Box>
            <Box>
              <FormLabel htmlFor="endTime">Lainaus loppuu</FormLabel>
              <Input id="endTime" value={timeStringWithoutTimeZone(endTime)} readOnly />
            </Box>
          </Stack>

          <Box mt={4}>
            <Text as="span" color={requiredColor}>*</Text> Pakollinen kenttä
          </Box>
          {isKiosk && (
            <Box
              mt={6}
              bg={kioskInfoBg}
              borderRadius="lg"
              borderWidth="2px"
              borderColor={kioskInfoBorder}
              p={4}
            >
              <Text fontSize="md" lineHeight="tall">
                Tarkista ennen varauksen vahvistamista, että kaikki kamat ovat kunnossa ja
                mahdolliset vahingot on raportoitu alla olevaan kenttään. (Esim. puuttuvat kiilat,
                reikä laavussa tms.)
              </Text>
              <Text fontSize="md" lineHeight="tall" mt={2} color={'red.600'}>
                <IoMdAlert style={{ display: 'inline', marginRight: '8px' }} />
                Huomio: Voit joutua korvausvastuuseen, mikäli et ole raportoinut etukäteen kamoissa
                havaitsemiasi puutteita tai vahinkoja.
              </Text>
              <Textarea
                placeholder="Kirjoita raportti tähän..."
                value={reportContent}
                onChange={(e) => setReportContent(e.target.value)}
                mt={3}
                size="sm"
                minH="100px"
              />
            </Box>
          )}
          {cart.items.length > 0 ? (
            <Stack spacing={2} marginTop="20px">
              <Heading as="h3" size="md">
                Valitut tavarat
              </Heading>
              {cart.items.map((item) => {
                if (item.amount <= 0) return null;
                const isCustomItem = item.id.startsWith('custom-');
                const isIncrementDisabled = isCustomItem
                  ? false
                  : !availabilities[item.id] ||
                    getCartAmount(item.id) >= availabilities[item.id].available;

                return (
                  <Box key={item.id}>
                    <FormLabel htmlFor={`item-${item.id}`}>{item.name}</FormLabel>
                    <Flex>
                      <IconButton
                        icon={<FaMinus />}
                        aria-label="decrement"
                        onClick={() => decrementAmount(item.id)}
                        borderRightRadius={0}
                        size="md"
                      />
                      <Input
                        id={`item-${item.id}`}
                        value={item.amount}
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
                        onClick={() => incrementAmount(item.id)}
                        borderLeftRadius={0}
                        size="md"
                        isDisabled={isIncrementDisabled}
                      />
                    </Flex>
                  </Box>
                );
              })}
            </Stack>
          ) : (
            <Flex
              direction="column"
              align="center"
              justify="center"
              flex="1"
              py={12}
              color="gray.500"
            >
              <Text fontSize="lg">Ostoskori on tyhjä</Text>
              <Text fontSize="sm" mt={2}>
                Lisää tavaroita ostoskoriin aloittaaksesi lainauksen
              </Text>
            </Flex>
          )}
        </DrawerBody>

        <DrawerFooter borderTopWidth="1px" flexShrink={0}>
          <Button variant="outline" mr={3} onClick={onClose}>
            Sulje
          </Button>
          <Button
            colorScheme="blue"
            onClick={ConfirmationDialog.onOpen}
            isDisabled={cart.items.length === 0 || !isDescriptionValid || !cart.loaner}
          >
            Lainaa
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
