import React from 'react';
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
} from '@chakra-ui/react';
import { FaMinus, FaPlus, FaTrash, FaHistory } from 'react-icons/fa';
import { useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import NotAuthenticated from '../../../components/NotAuthenticated';
import prisma from '../../../utils/prisma';
import { useRouter } from 'next/router';
import type { GetServerSideProps } from 'next';
import { Loan, Item, User, Reservation } from '@prisma/client';

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
    props: {
      loan: JSON.parse(JSON.stringify(loan)),
      items: JSON.parse(JSON.stringify(items)),
    },
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

  const { data: session } = useSession();

  const router = useRouter();

  if (session?.user?.group !== 'ADMIN') {
    return <NotAuthenticated />;
  }

  async function updateLoan() {
    await fetch(`/api/loan/updateLoan`, {
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
    })
      .then((res) => res.json())
      .then(() => {
        toast({
          title: 'Laina päivitetty',
          description: 'Laina päivitetty onnistuneesti',
          status: 'success',
          duration: 9000,
          isClosable: true,
        });
      })
      .then(onClose)
      .then(() => {
        router.push('/loan');
      })
      .catch(() => {
        toast({
          title: 'Error',
          description: 'Joku meni vituiks',
          status: 'error',
          duration: 9000,
          isClosable: true,
        });
      });
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

  return (
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
      <Box borderWidth="1px" borderRadius="lg" p={6} bg="white" boxShadow="sm">
        <Heading size="md" mb={4}>
          Perustiedot
        </Heading>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          <Box>
            <Text fontWeight="medium" color="gray.600" fontSize="sm">
              Lainan ID
            </Text>
            <Text fontFamily="mono" fontSize="sm">
              {loan.id}
            </Text>
          </Box>
          <Box>
            <Text fontWeight="medium" color="gray.600" fontSize="sm">
              Lainaaja
            </Text>
            <Text fontWeight="medium">{loan.user.name}</Text>
            <Text fontSize="sm" color="gray.600">
              {loan.user.email}
            </Text>
          </Box>
        </SimpleGrid>
      </Box>

      {/* Description Card */}
      <Box borderWidth="1px" borderRadius="lg" p={6} bg="white" boxShadow="sm">
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
            borderColor={isDescriptionModified ? 'orange.300' : 'gray.200'}
            borderWidth={isDescriptionModified ? '2px' : '1px'}
            value={description ?? ''}
            placeholder="Ei kuvausta"
            onChange={handleDescriptionChange}
            rows={3}
          />
        </FormControl>
      </Box>

      {/* Dates Card */}
      <Box borderWidth="1px" borderRadius="lg" p={6} bg="white" boxShadow="sm">
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
              borderColor={isStartDateModified ? 'orange.300' : 'gray.200'}
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
              borderColor={isEndDateModified ? 'orange.300' : 'gray.200'}
              borderWidth={isEndDateModified ? '2px' : '1px'}
              onChange={handleEndDateChange}
              type="datetime-local"
              value={endDate}
            />
          </FormControl>
        </SimpleGrid>
      </Box>

      {/* Reservations Card */}
      <Box borderWidth="1px" borderRadius="lg" p={6} bg="white" boxShadow="sm">
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
                      : 'gray.200'
                }
                bg={isNewReservation(reservation) ? 'green.50' : 'white'}
              >
                <Stack
                  direction={{ base: 'column', sm: 'row' }}
                  justify="space-between"
                  align={{ base: 'stretch', sm: 'center' }}
                  spacing={3}
                >
                  <HStack flex={1}>
                    <Text fontWeight="medium">{reservation.item.name}</Text>
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
                      isDisabled={reservation.amount >= reservation.item.amount}
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
      <Box borderWidth="1px" borderRadius="lg" p={6} bg="white" boxShadow="sm">
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
            <FormLabel>Määrä</FormLabel>
            <NumberInput
              value={selectedItemAmount}
              onChange={(valueString) => {
                const value = parseInt(valueString) || 0;
                setSelectedItemAmount(value);
              }}
              min={0}
              max={items.find((item) => item.id === selectedItem)?.amount ?? 99}
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

                newReservations.push({
                  id: Math.random().toString(),
                  amount: selectedItemAmount,
                  itemId: selectedItem,
                  loanId: loan.id,
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
  );
}
