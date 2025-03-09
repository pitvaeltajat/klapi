import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  useToast,
  useDisclosure,
} from "@chakra-ui/react";
import React from "react";
import { clearCart } from "/redux/cart.slice";
import { useDispatch, useSelector } from "react-redux";
import { useSession } from "next-auth/react";

export default function SubmitConfirmation({ isOpen, onClose, closeDrawer }) {
  const dates = useSelector((state) => state.dates);
  const cart = useSelector((state) => state.cart);
  const cancelRef = React.useRef();
  const dispatch = useDispatch();

  const { data: session, status } = useSession();

  const cartDrawer = useDisclosure();

  const [isLoading, setIsLoading] = React.useState(false);

  const toast = useToast();
  function successToast() {
    toast({
      title: "Varaus lähetetty",
      description:
        "Varaus rekisteröitiin onnistuneesti. Voit tarkastella omia varauksiasi Oma tili -valikon takaa.",
      status: "success",
      duration: 9000,
      isClosable: true,
    });
  }

  async function submitLoan() {
    setIsLoading(true);
    const startTime = dates.startDate;
    const endTime = dates.endDate;

    const userId = session?.user?.id;

    const reservations = cart.items.map((cartitem) => ({
      item: { connect: { id: cartitem.id } },
      amount: cartitem.amount,
    }));

    const description = cart.description;

    const body = {
      reservations,
      startTime,
      endTime,
      userId,
      description,
    };
    await fetch("api/loan/submitLoan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })
      .then((response) => console.log(response))
      .then(() => dispatch(clearCart()))
      .then(onClose)
      .then(successToast())
      .then(closeDrawer)
      .then(() => setIsLoading(false));
  }

  return (
    <AlertDialog
      isOpen={isOpen}
      leastDestructiveRef={cancelRef}
      onClose={onClose}
    >
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            Tarkista varauksen tiedot:
          </AlertDialogHeader>
          <AlertDialogBody>
            <p>
              <b>Kamojen nouto: </b>
              {dates.startDate.toLocaleString("fi", {
                day: "numeric",
                year: "numeric",
                month: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
              <br />

              <b>Kamojen palautus: </b>
              {dates.endDate.toLocaleString("fi", {
                day: "numeric",
                year: "numeric",
                month: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
            <br />

            <p>Varattavat kamat:</p>
            <br />

            <TableContainer>
              <Table variant="simple" size={"sm"}>
                <Thead>
                  <Tr>
                    <Th>Kama</Th>
                    <Th isNumeric>Määrä</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {cart.items.map((cartItem) => (
                    <Tr key={cartItem.id}>
                      <Td>{cartItem.name}</Td>
                      <Td isNumeric>{cartItem.amount}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          </AlertDialogBody>

          <AlertDialogFooter>
            <Button ref={cancelRef} onClick={onClose}>
              Peruuta
            </Button>
            <Button
              colorScheme="green"
              onClick={() => submitLoan()}
              ml={3}
              isLoading={isLoading}
            >
              Vahvista varaus
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
}
