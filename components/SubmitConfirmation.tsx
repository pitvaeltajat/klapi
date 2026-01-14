import { Dialog, Button, Table } from "@chakra-ui/react";

import { toaster, Toaster } from "@/components/ui/toaster";

import React from "react";
import { CartItem } from "../types";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useCart } from "@/contexts/CartContext";
import { useDates } from "@/contexts/DatesContext";
import { spacing, buttonColors } from "@/styles/designTokens";

export default function SubmitConfirmation({
  isOpen,
  onClose,
  closeDrawer,
}: {
  isOpen: boolean;
  onClose: () => void;
  closeDrawer: () => void;
}) {
  const { state: dates } = useDates();
  const { state: cart, clearCart } = useCart();
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const router = useRouter();

  const { data: session } = useSession();

  const [isLoading, setIsLoading] = React.useState(false);

  const successToast = () => {
    toaster.create({
      title: "Varaus lähetetty",
      description:
        "Varaus rekisteröitiin onnistuneesti. Voit tarkastella omia varauksiasi Oma tili -valikon takaa.",
      status: "success",
      duration: 9000,
      isClosable: true,
    });
  };

  const errorToast = () => {
    toaster.create({
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

    // Use userId from cart context if available (kiosk mode with selected user)
    // Otherwise fall back to session user id
    const userId = cart.userId || session?.user?.id;

    const reservations = cart.items.map((cartitem: CartItem) => ({
      itemId: cartitem.id,
      amount: cartitem.amount,
      // include name for custom items so API can create temporary Item records
      ...(cartitem.id.startsWith("custom-") ? { name: cartitem.name } : {}),
    }));

    const description = cart.description;
    const loaner = cart.loaner;

    const body = {
      reservations,
      startTime,
      endTime,
      userId,
      description,
      loaner,
    };

    const response = await fetch("/api/loan/submitLoan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      clearCart();
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
    <Dialog.Root
      role="alertdialog"
      isOpen={isOpen}
      leastDestructiveRef={cancelRef}
      onClose={onClose}
    >
      <Dialog.Backdrop>
        <Dialog.Content>
          <Dialog.CloseTrigger />
          <Dialog.Header fontSize="lg" fontWeight="bold">
            <Dialog.Title>Tarkista varauksen tiedot:</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <p>
              <b>Lainaaja: </b>
              {cart.loaner ||
                session?.user?.name ||
                session?.user?.email ||
                "Ei määritelty"}
              <br />
              <br />

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

            <Table.ScrollArea>
              <Table.Root variant="line" size={"sm"}>
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>Kama</Table.ColumnHeader>
                    <Table.ColumnHeader>Määrä</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {cart.items.map((cartItem) => (
                    <Table.Row key={cartItem.id}>
                      <Table.Cell>{cartItem.name}</Table.Cell>
                      <Table.Cell>{cartItem.amount}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Table.ScrollArea>
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
              onClick={handleSubmit}
              ml={spacing.elementSpacing}
              loading={isLoading}
            >
              Lähetä varaus
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Backdrop>
    </Dialog.Root>
  );
}
