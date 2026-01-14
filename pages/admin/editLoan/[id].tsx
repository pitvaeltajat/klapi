import React from "react";
import {
  Heading,
  Input,
  InputGroup,
  InputRightAddon,
  Text,
  Table,
  IconButton,
  InputLeftAddon,
  Stack,
  Button,
  Select,
  NumberInput,
  Dialog,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Textarea,
  useDisclosure,
  Container,
  VStack,
  Box,
  Field,
  FormLabel,
  HStack,
} from "@chakra-ui/react";
import { FaMinus, FaPlus, FaTrash, FaHistory } from "react-icons/fa";
import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import NotAuthenticated from "../../../components/NotAuthenticated";
import prisma from "../../../utils/prisma";
import { useRouter } from "next/router";
import type { GetServerSideProps } from "next";
import { Loan, Item, User, Reservation } from "@prisma/client";
import {
  cardStyles,
  headingSizes,
  spacing,
  containerMaxWidth,
  buttonColors,
} from "@/styles/designTokens";

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

export default function LoanEditView({
  loan,
  items,
}: {
  loan: LoanWithRelations;
  items: Item[];
}) {
  const [description, setDescription] = useState(loan.description);
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    setDescription(e.target.value);

  const [startDate, setStartDate] = useState(
    loan.startTime.toString().split(".")[0]
  );
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setStartDate(e.target.value);
  const [endDate, setEndDate] = useState(loan.endTime.toString().split(".")[0]);
  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setEndDate(e.target.value);

  const [selectedItem, setSelectedItem] = useState(items[0].id);
  const [selectedItemAmount, setSelectedItemAmount] = useState(0);

  const [reservations, setReservations] = useState(loan.reservations);

  const { open, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);

  const { data: session } = useSession();

  const router = useRouter();

  if (session?.user?.group !== "ADMIN") {
    return <NotAuthenticated />;
  }

  async function updateLoan() {
    await fetch(`/api/loan/updateLoan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
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
        toaster.create({
          title: "Laina päivitetty",
          description: "Laina päivitetty onnistuneesti",
          status: "success",
          duration: 9000,
          isClosable: true,
        });
      })
      .then(onClose)
      .then(() => {
        router.push("/loan");
      })
      .catch(() => {
        toaster.create({
          title: "Error",
          description: "Joku meni vituiks",
          status: "error",
          duration: 9000,
          isClosable: true,
        });
      });
  }

  return (
    <Container maxW={containerMaxWidth} {...spacing.containerPadding}>
      <Dialog.Root
        role="alertdialog"
        isOpen={open}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
      >
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header fontSize="lg" fontWeight="bold">
              Päivitä Laina
            </Dialog.Header>

            <Dialog.Body>
              Oletko täysin varma? Systeemi voi mennä ihan vitun solmuun, jos
              tiedot ei ole kunnolla tarkistettuja.{" "}
            </Dialog.Body>

            <Dialog.Footer>
              <Button
                ref={cancelRef}
                onClick={onClose}
                colorScheme={buttonColors.secondary}
              >
                Peruuta
              </Button>
              <Button
                colorScheme={buttonColors.success}
                ml={spacing.elementSpacing}
                onClick={() => updateLoan()}
              >
                Vahvista
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      <VStack gap={spacing.sectionSpacing} align="stretch">
        <Heading size={headingSizes.pageTitle}>Muokkaa lainaa</Heading>

        <Box {...cardStyles.base}>
          <VStack gap={spacing.elementSpacing} align="stretch">
            <Box>
              <Text fontSize="sm" color="gray.600" fontWeight="medium">
                Id:
              </Text>
              <Text>{loan.id}</Text>
            </Box>
            <Box>
              <Text fontSize="sm" color="gray.600" fontWeight="medium">
                Lainaaja:
              </Text>
              <Text>{loan.user.name}</Text>
              <Text>{loan.user.email}</Text>
            </Box>
          </VStack>
        </Box>

        <Box {...cardStyles.base}>
          <VStack gap={spacing.elementSpacing} align="stretch">
            <Heading size={headingSizes.sectionTitle}>Kuvaus</Heading>
            <Stack gap={spacing.tightSpacing} direction="row">
              <Textarea
                borderColor={
                  description != loan.description ? "orange.200" : "gray.300"
                }
                borderWidth={description != loan.description ? "2px" : "1px"}
                value={description ?? ""}
                maxW="400px"
                placeholder={"Ei kuvausta"}
                onChange={handleDescriptionChange}
              />
              <IconButton
                aria-label="Reset"
                icon={<FaHistory />}
                onClick={() => setDescription(loan.description)}
              />
            </Stack>
            {description != loan.description ? (
              <Text fontSize="sm" color="gray.500">
                Muokattu
              </Text>
            ) : null}
          </VStack>
        </Box>

        <Box {...cardStyles.base}>
          <VStack gap={spacing.elementSpacing} align="stretch">
            <Heading size={headingSizes.sectionTitle}>Päivämäärät</Heading>

            <Field.Root>
              <FormLabel>Aloitus</FormLabel>
              <Stack direction="row" gap={spacing.tightSpacing}>
                <Input
                  borderColor={
                    startDate != loan.startTime.toString().split(".")[0]
                      ? "orange.200"
                      : "gray.300"
                  }
                  borderWidth={
                    startDate != loan.startTime.toString().split(".")[0]
                      ? "2px"
                      : "1px"
                  }
                  onChange={handleStartDateChange}
                  maxW="300px"
                  type={"datetime-local"}
                  value={startDate}
                />
                <IconButton
                  aria-label="Reset"
                  icon={<FaHistory />}
                  onClick={() =>
                    setStartDate(loan.startTime.toString().split(".")[0])
                  }
                />
              </Stack>
              {startDate != loan.startTime.toString().split(".")[0] ? (
                <Text fontSize="sm" color="gray.500" mt={spacing.tightSpacing}>
                  Muokattu
                </Text>
              ) : null}
            </Field.Root>

            <Field.Root>
              <FormLabel>Lopetus</FormLabel>
              <Stack direction="row" gap={spacing.tightSpacing}>
                <Input
                  borderColor={
                    endDate != loan.endTime.toString().split(".")[0]
                      ? "orange.200"
                      : "gray.300"
                  }
                  borderWidth={
                    endDate != loan.endTime.toString().split(".")[0]
                      ? "2px"
                      : "1px"
                  }
                  onChange={handleEndDateChange}
                  maxW="300px"
                  type={"datetime-local"}
                  value={endDate}
                />
                <IconButton
                  aria-label="Reset"
                  icon={<FaHistory />}
                  onClick={() =>
                    setEndDate(loan.endTime.toString().split(".")[0])
                  }
                />
              </Stack>
              {endDate != loan.endTime.toString().split(".")[0] ? (
                <Text fontSize="sm" color="gray.500" mt={spacing.tightSpacing}>
                  Muokattu
                </Text>
              ) : null}
            </Field.Root>
          </VStack>
        </Box>

        <Box {...cardStyles.base}>
          <VStack gap={spacing.elementSpacing} align="stretch">
            <Heading size={headingSizes.sectionTitle}>Varaukset</Heading>

            <HStack justify="space-between" mb={spacing.tightSpacing}>
              <Text fontWeight="medium">Varaukset</Text>
              <IconButton
                aria-label={"Palauta"}
                title={"Palauta"}
                icon={<FaHistory />}
                onClick={() => {
                  setReservations(loan.reservations);
                }}
                size="sm"
              />
              '
            </HStack>
            <Table.ScrollArea>
              '
              <Table.Root>
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>Kama</Table.ColumnHeader>
                    <Table.ColumnHeader>Määrä</Table.ColumnHeader>
                    <Table.ColumnHeader>Toiminnot</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {reservations.map((reservation) => {
                    return (
                      <Table.Row key={reservation.id}>
                        <Table.Cell
                          color={
                            loan.reservations.filter(
                              (r) => r.id == reservation.id
                            ).length > 0
                              ? "gray.900"
                              : "orange.500"
                          }
                        >
                          {reservation.item.name}
                        </Table.Cell>
                        <Table.Cell>
                          <InputGroup size="sm" maxW="150px">
                            <InputLeftAddon p={0}>
                              <IconButton
                                icon={<FaMinus />}
                                onClick={() => {
                                  if (reservation.amount > 1) {
                                    setReservations(
                                      reservations.map((r) => {
                                        if (r.id == reservation.id) {
                                          return { ...r, amount: r.amount - 1 };
                                        }
                                        return r;
                                      })
                                    );
                                  }
                                }}
                                isDisabled={reservation.amount <= 1}
                                aria-label="Vähennä määrää"
                                size="sm"
                              />
                            </InputLeftAddon>
                            <Input
                              borderColor={
                                loan.reservations.filter(
                                  (r) => r.id == reservation.id
                                ).length > 0
                                  ? reservation.amount ==
                                    loan.reservations.filter(
                                      (r) => r.id == reservation.id
                                    )[0].amount
                                    ? "gray.300"
                                    : "orange.200"
                                  : "gray.300"
                              }
                              borderWidth={
                                loan.reservations.filter(
                                  (r) => r.id == reservation.id
                                ).length > 0
                                  ? reservation.amount ==
                                    loan.reservations.filter(
                                      (r) => r.id == reservation.id
                                    )[0].amount
                                    ? "1px"
                                    : "2px"
                                  : "1px"
                              }
                              value={reservation.amount}
                              textAlign="center"
                              readOnly
                            />
                            <InputRightAddon p={0}>
                              <IconButton
                                icon={<FaPlus />}
                                aria-label="Lisää määrää"
                                onClick={() => {
                                  setReservations(
                                    reservations.map((r) => {
                                      if (r.id == reservation.id) {
                                        return { ...r, amount: r.amount + 1 };
                                      }
                                      return r;
                                    })
                                  );
                                }}
                                isDisabled={
                                  reservation.amount >= reservation.item.amount
                                }
                                size="sm"
                              />
                            </InputRightAddon>
                          </InputGroup>
                        </Table.Cell>
                        <Table.Cell>
                          <IconButton
                            aria-label="Poista varaus"
                            icon={<FaTrash />}
                            onClick={() => {
                              setReservations(
                                reservations.filter(
                                  (r) => r.id != reservation.id
                                )
                              );
                            }}
                            colorScheme={buttonColors.danger}
                            size="sm"
                            variant="ghost"
                          />
                        </Table.Cell>
                      </Table.Row>
                    );
                  })}
                </Table.Body>
              </Table.Root>
            </Table.ScrollArea>
          </VStack>
        </Box>

        <Box {...cardStyles.base}>
          <VStack gap={spacing.elementSpacing} align="stretch">
            <Heading size={headingSizes.subsection}>Lisää kama</Heading>
            <Stack
              direction={"row"}
              gap={spacing.elementSpacing}
              flexWrap="wrap"
            >
              <Select
                value={selectedItem}
                onChange={(e) => {
                  setSelectedItem(e.target.value);
                  setSelectedItemAmount(0);
                }}
                maxW="300px"
              >
                {items.map((item) => {
                  return (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  );
                })}
              </Select>
              <NumberInput
                value={selectedItemAmount}
                onChange={(valueString) => {
                  const value = parseInt(valueString) || 0;
                  setSelectedItemAmount(value);
                }}
                min={0}
                max={
                  items.find((item) => item.id === selectedItem)?.amount ?? 99
                }
                maxW="150px"
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
              <Button
                onClick={() => {
                  const newReservations = [...reservations];
                  const selectedItemObj = items.find(
                    (item) => item.id === selectedItem
                  );
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
                disabled={selectedItemAmount === 0}
                colorScheme={buttonColors.primary}
              >
                Lisää
              </Button>
            </Stack>
          </VStack>
        </Box>

        <Button colorScheme={buttonColors.success} onClick={onOpen} size="lg">
          Tallenna
        </Button>
      </VStack>
    </Container>
  );
}
