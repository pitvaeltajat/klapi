import {
  Box,
  Heading,
  Input,
  InputGroup,
  InputRightAddon,
  InputRightElement,
  TableContainer,
  Text,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  IconButton,
  InputLeftAddon,
  Stack,
  FormLabel,
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
} from "@chakra-ui/react";
import { FaMinus, FaPlus, FaTrash, FaHistory } from "react-icons/fa";
import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import NotAuthenticated from "../../../components/NotAuthenticated";
import prisma from "/utils/prisma";
import { useRouter } from "next/router";

export async function getServerSideProps(req, res) {
  const loan = await prisma.loan.findUnique({
    where: {
      id: req.params.id,
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
      loan,
      items,
    },
  };
}

export default function LoanEditView({ loan, items }) {
  const [description, setDescription] = useState(loan.description);
  const handleDescriptionChange = (e) => setDescription(e.target.value);

  const [startDate, setStartDate] = useState(
    loan.startTime.toISOString().split(".")[0],
  );
  const handleStartDateChange = (e) => setStartDate(e.target.value);
  const [endDate, setEndDate] = useState(
    loan.endTime.toISOString().split(".")[0],
  );
  const handleEndDateChange = (e) => setEndDate(e.target.value);

  const [selectedItem, setSelectedItem] = useState(items[0].id);
  const [selectedItemAmount, setSelectedItemAmount] = useState(0);

  const [reservations, setReservations] = useState([...loan.reservations]);

  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef();

  const toast = useToast();

  const { data: session } = useSession();

  const router = useRouter();

  if (session?.user?.group !== "ADMIN") {
    return <NotAuthenticated />;
  }

  async function updateLoan() {
    const res = await fetch(`/api/loan/updateLoan`, {
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
      .then((data) => {
        console.log(data);
        toast({
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
      .catch((err) => {
        console.log(err);
        toast({
          title: "Error",
          description: "Joku meni vituiks",
          status: "error",
          duration: 9000,
          isClosable: true,
        });
      });
  }

  return (
    <div>
      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Päivitä Laina
            </AlertDialogHeader>

            <AlertDialogBody>
              Oletko täysin varma? Systeemi voi mennä ihan vitun solmuun, jos
              tiedot ei ole kunnolla tarkistettuja.{" "}
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

      <Heading>Muokkaa lainaa</Heading>
      <Heading size="md">Id:</Heading>
      <Text>{loan.id}</Text>
      <Heading size="md">Lainaaja:</Heading>
      <Text>{loan.user.name}</Text>
      <Text>{loan.user.email}</Text>

      <Heading size={"lg"} marginTop="1em">
        Kuvaus:
      </Heading>

      <Stack spacing={3} direction="row">
        <Textarea
          borderColor={
            description != loan.description ? "orange.200" : "gray.300"
          }
          borderWidth={description != loan.description ? "2px" : "1px"}
          value={description}
          width="20em"
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
        <Text size={"s"} color="gray.500">
          Muokattu
        </Text>
      ) : null}
      <Heading size={"lg"} marginTop={"1em"}>
        Päivämäärät:
      </Heading>

      <Heading size={"md"} marginTop={"1em"}>
        Aloitus:
      </Heading>
      <Stack direction="row">
        <Input
          borderColor={
            startDate != loan.startTime.toISOString().split(".")[0]
              ? "orange.200"
              : "gray.300"
          }
          borderWidth={
            startDate != loan.startTime.toISOString().split(".")[0]
              ? "2px"
              : "1px"
          }
          onChange={handleStartDateChange}
          width="20em"
          type={"datetime-local"}
          value={startDate}
        />
        <IconButton
          aria-label="Reset"
          icon={<FaHistory />}
          onClick={() =>
            setStartDate(loan.startTime.toISOString().split(".")[0])
          }
        />
      </Stack>
      {startDate != loan.startTime.toISOString().split(".")[0] ? (
        <Text size={"s"} color="gray.500">
          Muokattu
        </Text>
      ) : null}
      <Heading size={"md"} marginTop={"1em"}>
        Lopetus:
      </Heading>
      <Stack direction="row">
        <Input
          borderColor={
            endDate != loan.endTime.toISOString().split(".")[0]
              ? "orange.200"
              : "gray.300"
          }
          borderWidth={
            endDate != loan.endTime.toISOString().split(".")[0] ? "2px" : "1px"
          }
          onChange={handleEndDateChange}
          width="20em"
          type={"datetime-local"}
          value={endDate}
        />
        <IconButton
          aria-label="Reset"
          icon={<FaHistory />}
          onClick={() => setEndDate(loan.endTime.toISOString().split(".")[0])}
        />
      </Stack>
      {endDate != loan.endTime.toISOString().split(".")[0] ? (
        <Text size={"s"} color="gray.500">
          Muokattu
        </Text>
      ) : null}

      <Heading size={"lg"} marginTop={"1em"}>
        Varaukset:
      </Heading>

      <TableContainer>
        <Table>
          <Thead>
            <Tr>
              <Th>Kama</Th>
              <Th>Määrä</Th>
              <Th>
                <IconButton
                  position={"relative"}
                  right={"0px"}
                  aria-label={"Palauta"}
                  title={"Palauta"}
                  icon={<FaHistory />}
                  onClick={() => {
                    setReservations([...loan.reservations]);
                    console.log(loan.reservations);
                  }}
                />
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {reservations.map((reservation) => {
              return (
                <Tr key={reservation.id}>
                  <Td
                    color={
                      loan.reservations.filter((r) => r.id == reservation.id)
                        .length > 0
                        ? "gray.900"
                        : "orange.500"
                    }
                  >
                    {reservation.item.name}
                  </Td>
                  <Td>
                    <InputGroup>
                      <InputLeftAddon>
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
                                }),
                              );
                            }
                          }}
                          isDisabled={reservation.amount <= 1}
                        />
                      </InputLeftAddon>
                      <Input
                        borderColor={
                          loan.reservations.filter(
                            (r) => r.id == reservation.id,
                          ).length > 0
                            ? reservation.amount ==
                              loan.reservations.filter(
                                (r) => r.id == reservation.id,
                              )[0].amount
                              ? "gray.300"
                              : "orange.200"
                            : "gray.300"
                        }
                        borderWidth={
                          loan.reservations.filter(
                            (r) => r.id == reservation.id,
                          ).length > 0
                            ? reservation.amount ==
                              loan.reservations.filter(
                                (r) => r.id == reservation.id,
                              )[0].amount
                              ? "1px"
                              : "2px"
                            : "1px"
                        }
                        value={reservation.amount}
                        width="5em"
                      />
                      <InputRightAddon>
                        <IconButton
                          icon={<FaPlus />}
                          onClick={() => {
                            setReservations(
                              reservations.map((r) => {
                                if (r.id == reservation.id) {
                                  return { ...r, amount: r.amount + 1 };
                                }
                                return r;
                              }),
                            );
                          }}
                          isDisabled={
                            reservation.amount >= reservation.item.amount
                          }
                        />
                      </InputRightAddon>
                    </InputGroup>
                  </Td>
                  <Td>
                    <IconButton
                      icon={<FaTrash />}
                      onClick={() => {
                        setReservations(
                          reservations.filter((r) => r.id != reservation.id),
                        );
                      }}
                    />
                  </Td>
                  <Td>
                    <IconButton
                      icon={<FaHistory />}
                      onClick={() => {
                        setReservationToDelete(reservation);
                        onOpen();
                      }}
                    />
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </TableContainer>
      <Heading size={"lg"} marginTop={"1em"}>
        Lisää kama:
      </Heading>
      <Stack marginTop={"1em"} direction={"row"} spacing={4}>
        <Select
          value={selectedItem}
          onChange={(e) => {
            setSelectedItem(e.target.value);
            setSelectedItemAmount(0);
          }}
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
          value={parseInt(selectedItemAmount)}
          onChange={(e) => {
            setSelectedItemAmount(parseInt(e));
          }}
          min={0}
          max={items.filter((item) => item.id == selectedItem)[0].amount}
        >
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
        <Button
          onClick={() => {
            reservations.push({
              id: Math.random(),
              amount: selectedItemAmount,
              item: items.filter((item) => item.id == selectedItem)[0],
            });
            console.log(reservations);
            setReservations(reservations);
            setSelectedItemAmount(0);
          }}
          isDisabled={selectedItemAmount == 0}
        >
          Lisää
        </Button>
      </Stack>

      <Button colorScheme={"green"} marginTop={"1em"} onClick={onOpen}>
        Tallenna
      </Button>
    </div>
  );
}
