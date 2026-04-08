import React from 'react';
import Head from 'next/head';
import {
  Heading,
  Input,
  Text,
  IconButton,
  useToast,
  Button,
  Select,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Textarea,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
  VStack,
  HStack,
  Box,
  FormControl,
  FormLabel,
  SimpleGrid,
  Flex,
  Badge,
  Stack,
  useColorModeValue,
} from '@chakra-ui/react';
import { FaMinus, FaPlus, FaTrash, FaHistory } from 'react-icons/fa';
import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import NotAuthenticated from '../../../components/NotAuthenticated';
import LoadingSpinner from '../../../components/LoadingSpinner';
import Breadcrumbs from '../../../components/Breadcrumbs';
import prisma from '../../../utils/prisma';
import { useRouter } from 'next/router';
import type { GetServerSideProps } from 'next';
import { serialize } from '@/utils/serialize';
import { Loan, Item, User, Reservation, ReservationStatus, LoanStatus } from '@prisma/client';
import { deriveLoanStatus } from '../../../utils/loanHelpers';

interface AvailabilityData {
  availabilities: Record<string, { available: number }>;
}

interface LoanWithRelations extends Loan {
  reservations: (Reservation & {
    item: Item;
  })[];
  user: User;
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const loan = await prisma.loan.findUnique({
    where: {
      id: context.params?.id as string,
    },
    include: {
      reservations: {
        include: {
          item: true,
        },
      },
      user: true,
    },
  });
  const items = await prisma.item.findMany({});
  if (!loan) {
    return {
      props: { notFound: true },
    };
  }
  return {
    props: serialize({
      loan,
      items,
    }),
  };
};

export default function LoanEditView({ loan, items }: { loan: LoanWithRelations; items: Item[] }) {
  const [description, setDescription] = useState(loan.description);
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    setDescription(e.target.value);

  const [startDate, setStartDate] = useState(loan.startTime.toString().split('.')[0]);
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setStartDate(e.target.value);
  const [endDate, setEndDate] = useState(loan.endTime.toString().split('.')[0]);
  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setEndDate(e.target.value);

  const [selectedItem, setSelectedItem] = useState(items[0].id);
  const [selectedItemAmount, setSelectedItemAmount] = useState(0);

  const [reservations, setReservations] = useState(loan.reservations);

  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);

  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.800');
  const subtleText = useColorModeValue('gray.600', 'gray.400');
  const defaultBorder = useColorModeValue('gray.200', 'gray.600');
  const newItemBg = useColorModeValue('green.50', 'green.900');

  const { data: session } = useSession();

  const router = useRouter();

  // Availability state
  const [availabilityData, setAvailabilityData] = useState<AvailabilityData | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(true);

  // Fetch availability when dates change
  useEffect(() => {
    const fetchAvailability = async () => {
      setLoadingAvailability(true);
      try {
        const response = await fetch('/api/availability/getAvailabilities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            StartDate: new Date(startDate),
            EndDate: new Date(endDate),
          }),
        });
        const data = await response.json();
        setAvailabilityData(data);
      } catch (error) {
        console.error('Failed to fetch availability:', error);
      }
      setLoadingAvailability(false);
    };

    fetchAvailability();
  }, [startDate, endDate]);

  // Calculate effective availability for an item
  // This adds back the original reservation amounts since they're already "ours"
  const getEffectiveAvailability = (itemId: string): number => {
    if (!availabilityData?.availabilities?.[itemId]) {
      return 0;
    }

    const baseAvailability = availabilityData.availabilities[itemId].available;

    // Add back amounts from the ORIGINAL loan reservations (not current edits)
    // because those are already allocated to this loan
    const originalReservation = loan.reservations.find((r) => r.item.id === itemId);
    const originalAmount = originalReservation?.amount ?? 0;

    return baseAvailability + originalAmount;
  };

  // Get current total for an item in reservations (including any being edited)
  const getCurrentReservationAmount = (itemId: string): number => {
    return reservations.filter((r) => r.item.id === itemId).reduce((sum, r) => sum + r.amount, 0);
  };

  // Calculate max allowed for a specific reservation row
  const getMaxForReservation = (reservation: (typeof reservations)[0]): number => {
    const effectiveAvail = getEffectiveAvailability(reservation.item.id);
    const currentInOtherRows = reservations
      .filter((r) => r.item.id === reservation.item.id && r.id !== reservation.id)
      .reduce((sum, r) => sum + r.amount, 0);

    return Math.max(0, effectiveAvail - currentInOtherRows);
  };

  // Calculate max allowed when adding a new item
  const getMaxForNewItem = (itemId: string): number => {
    const effectiveAvail = getEffectiveAvailability(itemId);
    const currentTotal = getCurrentReservationAmount(itemId);

    return Math.max(0, effectiveAvail - currentTotal);
  };

  // Allow edit if user is admin OR if user owns this loan and status allows editing
  const isAdmin = session?.user?.group === 'ADMIN';
  const isOwner = session?.user?.id === loan.user.id;

  // Use derived status from reservations for edit permission check
  const derivedStatus = deriveLoanStatus(
    loan.reservations.map((r) => ({ status: r.status as ReservationStatus })),
    loan.status as LoanStatus,
  );
  const statusAllowsEdit = derivedStatus !== 'INUSE' && derivedStatus !== 'RETURNED';

  if (!session?.user || (!isAdmin && !isOwner)) {
    return <NotAuthenticated />;
  }

  // User can only edit their own loans if status allows
  if (!isAdmin && !statusAllowsEdit) {
    return <NotAuthenticated />;
  }

  async function updateLoan() {
    try {
      const response = await fetch(`/api/loan/updateLoan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: loan.id,
          description,
          startTime: new Date(startDate),
          endTime: new Date(endDate),
          reservations: reservations.map((r) => ({
            amount: r.amount,
            item: { connect: { id: r.item.id } },
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        let errorDescription = data.message || 'Joku meni vituiks';
        if (data.details && Array.isArray(data.details)) {
          errorDescription = data.details.join('\n');
        }

        toast({
          title: data.message || 'Virhe',
          description: errorDescription,
          status: 'error',
          duration: 9000,
          isClosable: true,
        });
        onClose();
        return;
      }

      toast({
        title: 'Laina päivitetty',
        description: 'Laina päivitetty onnistuneesti',
        status: 'success',
        duration: 9000,
        isClosable: true,
      });
      onClose();
      router.push('/loan');
    } catch {
      toast({
        title: 'Virhe',
        description: 'Yhteysvirhe - yritä uudelleen',
        status: 'error',
        duration: 9000,
        isClosable: true,
      });
      onClose();
    }
  }

  const isDescriptionModified = description !== loan.description;
  const isStartDateModified = startDate !== loan.startTime.toString().split('.')[0];
  const isEndDateModified = endDate !== loan.endTime.toString().split('.')[0];

  const isReservationModified = (reservation: (typeof reservations)[0]) => {
    const original = loan.reservations.find((r) => r.id === reservation.id);
    if (!original) return true;
    return reservation.amount !== original.amount;
  };

  const isNewReservation = (reservation: (typeof reservations)[0]) => {
    return !loan.reservations.find((r) => r.id === reservation.id);
  };

  if (loadingAvailability) {
    return (
      <>
        <Head>
          <title>Muokkaa lainaa | Klapi</title>
        </Head>
        <LoadingSpinner />
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Muokkaa lainaa | Klapi</title>
      </Head>
      <Breadcrumbs
        items={[
          { label: 'Varaukset', href: '/loan' },
          { label: loan.description || 'Ei kuvausta', href: `/loan/${loan.id}` },
          { label: 'Muokkaa' },
        ]}
      />
      <VStack spacing={6} align="stretch">
        {/* Confirmation Dialog */}
        <AlertDialog isOpen={isOpen} leastDestructiveRef={cancelRef} onClose={onClose}>
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Päivitä Laina
            </AlertDialogHeader>

            <AlertDialogBody>
              Oletko täysin varma? Systeemi voi mennä ihan vitun solmuun, jos tiedot ei ole kunnolla
              tarkistettuja.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose}>
                Peruuta
              </Button>
              <Button colorScheme="green" ml={3} onClick={() => updateLoan()}>
                Vahvista
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {/* Header */}
      <Heading size="xl">Muokkaa lainaa</Heading>

      {/* Loan Info Card */}
      <Box borderWidth="1px" borderRadius="lg" p={6} bg={cardBg} boxShadow="sm">
        <Heading size="md" mb={4}>
          Perustiedot
        </Heading>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          <Box>
            <Text fontWeight="medium" color={subtleText} fontSize="sm">
              Lainan ID
            </Text>
            <Text fontFamily="mono" fontSize="sm">
              {loan.id}
            </Text>
          </Box>
          <Box>
            <Text fontWeight="medium" color={subtleText} fontSize="sm">
              Lainaaja
            </Text>
            <Text fontWeight="medium">{loan.loaner || loan.user.name || loan.user.email}</Text>
            {loan.loaner && loan.user.name && loan.loaner !== loan.user.name && (
              <Text fontSize="sm" color={subtleText}>
                Tili: {loan.user.name} ({loan.user.email})
              </Text>
            )}
          </Box>
        </SimpleGrid>
      </Box>

      {/* Description Card */}
      <Box borderWidth="1px" borderRadius="lg" p={6} bg={cardBg} boxShadow="sm">
        <Flex justify="space-between" align="center" mb={4}>
          <HStack>
            <Heading size="md">Kuvaus</Heading>
            {isDescriptionModified && (
              <Badge colorScheme="orange" fontSize="xs">
                Muokattu
              </Badge>
            )}
          </HStack>
          <IconButton
            aria-label="Palauta alkuperäinen"
            icon={<FaHistory />}
            size="sm"
            variant="ghost"
            onClick={() => setDescription(loan.description)}
            isDisabled={!isDescriptionModified}
          />
        </Flex>
        <FormControl>
          <Textarea
            borderColor={isDescriptionModified ? 'orange.300' : defaultBorder}
            borderWidth={isDescriptionModified ? '2px' : '1px'}
            value={description ?? ''}
            placeholder="Ei kuvausta"
            onChange={handleDescriptionChange}
            rows={3}
          />
        </FormControl>
      </Box>

      {/* Dates Card */}
      <Box borderWidth="1px" borderRadius="lg" p={6} bg={cardBg} boxShadow="sm">
        <Heading size="md" mb={4}>
          Päivämäärät
        </Heading>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
          <FormControl>
            <Flex justify="space-between" align="center" mb={2}>
              <HStack>
                <FormLabel mb={0}>Aloitus</FormLabel>
                {isStartDateModified && (
                  <Badge colorScheme="orange" fontSize="xs">
                    Muokattu
                  </Badge>
                )}
              </HStack>
              <IconButton
                aria-label="Palauta alkuperäinen"
                icon={<FaHistory />}
                size="xs"
                variant="ghost"
                onClick={() => setStartDate(loan.startTime.toString().split('.')[0])}
                isDisabled={!isStartDateModified}
              />
            </Flex>
            <Input
              borderColor={isStartDateModified ? 'orange.300' : defaultBorder}
              borderWidth={isStartDateModified ? '2px' : '1px'}
              onChange={handleStartDateChange}
              type="datetime-local"
              value={startDate}
            />
          </FormControl>

          <FormControl>
            <Flex justify="space-between" align="center" mb={2}>
              <HStack>
                <FormLabel mb={0}>Lopetus</FormLabel>
                {isEndDateModified && (
                  <Badge colorScheme="orange" fontSize="xs">
                    Muokattu
                  </Badge>
                )}
              </HStack>
              <IconButton
                aria-label="Palauta alkuperäinen"
                icon={<FaHistory />}
                size="xs"
                variant="ghost"
                onClick={() => setEndDate(loan.endTime.toString().split('.')[0])}
                isDisabled={!isEndDateModified}
              />
            </Flex>
            <Input
              borderColor={isEndDateModified ? 'orange.300' : defaultBorder}
              borderWidth={isEndDateModified ? '2px' : '1px'}
              onChange={handleEndDateChange}
              type="datetime-local"
              value={endDate}
            />
          </FormControl>
        </SimpleGrid>
      </Box>

      {/* Reservations Card */}
      <Box borderWidth="1px" borderRadius="lg" p={6} bg={cardBg} boxShadow="sm">
        <Flex justify="space-between" align="center" mb={4}>
          <Heading size="md">Varaukset</Heading>
          <IconButton
            aria-label="Palauta kaikki varaukset"
            icon={<FaHistory />}
            size="sm"
            variant="ghost"
            onClick={() => setReservations(loan.reservations)}
          />
        </Flex>

        <VStack spacing={3} align="stretch">
          {reservations.length === 0 ? (
            <Text color="gray.500" fontStyle="italic">
              Ei varauksia
            </Text>
          ) : (
            reservations.map((reservation) => (
              <Box
                key={reservation.id}
                p={4}
                borderWidth="1px"
                borderRadius="md"
                borderColor={
                  isNewReservation(reservation)
                    ? 'green.300'
                    : isReservationModified(reservation)
                      ? 'orange.300'
                      : defaultBorder
                }
                bg={isNewReservation(reservation) ? newItemBg : cardBg}
              >
                <Stack
                  direction={{ base: 'column', sm: 'row' }}
                  justify="space-between"
                  align={{ base: 'stretch', sm: 'center' }}
                  spacing={3}
                >
                  <HStack flex={1} flexWrap="wrap">
                    <Text fontWeight="medium">{reservation.item.name}</Text>
                    <Badge colorScheme="gray" fontSize="xs">
                      max: {getMaxForReservation(reservation)}
                    </Badge>
                    {isNewReservation(reservation) && (
                      <Badge colorScheme="green" fontSize="xs">
                        Uusi
                      </Badge>
                    )}
                    {!isNewReservation(reservation) && isReservationModified(reservation) && (
                      <Badge colorScheme="orange" fontSize="xs">
                        Muokattu
                      </Badge>
                    )}
                  </HStack>

                  <HStack spacing={2}>
                    <IconButton
                      icon={<FaMinus />}
                      size="sm"
                      onClick={() => {
                        if (reservation.amount > 1) {
                          setReservations(
                            reservations.map((r) =>
                              r.id === reservation.id ? { ...r, amount: r.amount - 1 } : r,
                            ),
                          );
                        }
                      }}
                      isDisabled={reservation.amount <= 1}
                      aria-label="Vähennä määrää"
                    />
                    <Input
                      value={reservation.amount}
                      width="60px"
                      textAlign="center"
                      readOnly
                      size="sm"
                    />
                    <IconButton
                      icon={<FaPlus />}
                      size="sm"
                      aria-label="Lisää määrää"
                      onClick={() => {
                        setReservations(
                          reservations.map((r) =>
                            r.id === reservation.id ? { ...r, amount: r.amount + 1 } : r,
                          ),
                        );
                      }}
                      isDisabled={reservation.amount >= getMaxForReservation(reservation)}
                    />
                    <IconButton
                      aria-label="Poista varaus"
                      icon={<FaTrash />}
                      size="sm"
                      colorScheme="red"
                      variant="ghost"
                      onClick={() => {
                        setReservations(reservations.filter((r) => r.id !== reservation.id));
                      }}
                    />
                  </HStack>
                </Stack>
              </Box>
            ))
          )}
        </VStack>
      </Box>

      {/* Add Item Card */}
      <Box borderWidth="1px" borderRadius="lg" p={6} bg={cardBg} boxShadow="sm">
        <Heading size="md" mb={4}>
          Lisää kama
        </Heading>
        <Stack direction={{ base: 'column', md: 'row' }} spacing={4}>
          <FormControl flex={2}>
            <FormLabel>Kama</FormLabel>
            <Select
              value={selectedItem}
              onChange={(e) => {
                setSelectedItem(e.target.value);
                setSelectedItemAmount(0);
              }}
            >
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </FormControl>

          <FormControl flex={1}>
            <FormLabel>
              Määrä (vapaana: {getMaxForNewItem(selectedItem)})
            </FormLabel>
            <NumberInput
              value={selectedItemAmount}
              onChange={(valueString) => {
                const value = parseInt(valueString) || 0;
                setSelectedItemAmount(value);
              }}
              min={0}
              max={getMaxForNewItem(selectedItem)}
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          </FormControl>

          <Box alignSelf={{ base: 'stretch', md: 'flex-end' }}>
            <Button
              onClick={() => {
                const newReservations = [...reservations];
                const selectedItemObj = items.find((item) => item.id === selectedItem);
                if (!selectedItemObj) return;

                // New reservations get the same status as existing ones (or ACCEPTED if none)
                const existingStatus = loan.reservations[0]?.status || ReservationStatus.ACCEPTED;
                newReservations.push({
                  id: Math.random().toString(),
                  amount: selectedItemAmount,
                  itemId: selectedItem,
                  loanId: loan.id,
                  status: existingStatus,
                  item: selectedItemObj,
                });
                setReservations(newReservations);
                setSelectedItemAmount(0);
              }}
              isDisabled={selectedItemAmount === 0}
              colorScheme="blue"
              width={{ base: 'full', md: 'auto' }}
            >
              Lisää
            </Button>
          </Box>
        </Stack>
      </Box>

      {/* Save Button */}
      <Button colorScheme="green" size="lg" onClick={onOpen} width={{ base: 'full', md: 'auto' }}>
        Tallenna muutokset
      </Button>
      </VStack>
    </>
  );
}
