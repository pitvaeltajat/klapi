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
} from "@chakra-ui/react";
import React from "react";
import { clearCart } from "../redux/cart.slice";
import { useDispatch, useSelector } from "react-redux";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import type { RootState } from "../redux/store";

interface CartItem {
  id: string;
  amount: number;
}

interface Dates {
  startDate: Date;
  endDate: Date;
}

interface Cart {
  items: CartItem[];
  description: string;
}

export default function SubmitConfirmation({
  isOpen,
  onClose,
  closeDrawer,
}: {
  isOpen: boolean;
  onClose: () => void;
  closeDrawer: () => void;
}) {
  const dates = useSelector((state: RootState) => state.dates);
  const cart = useSelector((state: RootState) => state.cart);
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const dispatch = useDispatch();
  const router = useRouter();

  const { data: session } = useSession();

  const [isLoading, setIsLoading] = React.useState(false);

  const toast = useToast();

  const successToast = () => {
    toast({
      title: "Varaus lähetetty",
      description:
        "Varaus rekisteröitiin onnistuneesti. Voit tarkastella omia varauksiasi Oma tili -valikon takaa.",
      status: "success",
      duration: 9000,
      isClosable: true,
    });
  };

  const errorToast = () => {
    toast({
      title: "Error",
      description: "Varauksen lähetyksessä tapahtui virhe",
      status: "error",
      duration: 5000,
      isClosable: true,
    });
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    const startTime = dates.startDate;
    const endTime = dates.endDate;

    const userId = session?.user?.id;

    const reservations = cart.items.map((cartitem: CartItem) => ({
      itemId: cartitem.id,
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

    const response = await fetch("/api/loan/createLoan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      dispatch(clearCart());
      successToast();
      router.push("/account");
    } else {
      errorToast();
    }

    onClose();
    closeDrawer();
    setIsLoading(false);
  };

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
              onClick={handleSubmit}
              ml={3}
              isLoading={isLoading}
            >
              Lähetä varaus
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
}
