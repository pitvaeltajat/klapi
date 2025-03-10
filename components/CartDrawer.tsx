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
  InputGroup,
  InputLeftAddon,
  InputRightAddon,
  IconButton,
  Heading,
  useDisclosure,
} from "@chakra-ui/react";
import { useRef } from "react";
import { FaPlus, FaMinus } from "react-icons/fa";
import SubmitConfirmation from "./SubmitConfirmation";
import { useState } from "react";
import { useEffect } from "react";
import { useCart } from "@/contexts/CartContext";
import { useDates } from "@/contexts/DatesContext";

interface AvailabilityData {
  availabilities: Record<string, { available: number }>;
}

export default function CartDrawer({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const firstField = useRef<HTMLInputElement>(null);
  const {
    state: cart,
    incrementAmount,
    decrementAmount,
    setDescription,
  } = useCart();
  const cartItems = cart.items;
  const { state: dates } = useDates();

  const ConfirmationDialog = useDisclosure();

  const startTime = dates.startDate;
  const endTime = dates.endDate;

  const description = cart.description;

  const [data, setData] = useState<AvailabilityData | null>(null);
  const [loading, setLoading] = useState(true);

  const StartDate = dates.startDate;
  const EndDate = dates.endDate;

  useEffect(() => {
    setLoading(true);
    fetch("/api/availability/getAvailabilities", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ StartDate, EndDate }),
    })
      .then((response) => response.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch((error) => console.log(error));
  }, [StartDate, EndDate]);

  function getCartAmount(id: string): number {
    return cartItems.find(
      (cartItem: { id: string; amount: number }) => cartItem.id === id
    ) !== undefined
      ? cartItems.find(
          (cartItem: { id: string; amount: number }) => cartItem.id === id
        )!.amount
      : 0;
  }

  const availabilities = data?.availabilities;

  if (loading || !availabilities) {
    return <div>Ladataan...</div>;
  }

  const timeStringWithoutTimeZone = (date: Date): string => {
    return date.toISOString().split("T")[0];
  };

  return (
    <Drawer
      isOpen={isOpen}
      placement="right"
      size="full"
      initialFocusRef={firstField}
      onClose={onClose}
    >
      <DrawerOverlay />
      <DrawerContent height="100%">
        <DrawerCloseButton />
        <DrawerHeader borderBottomWidth="1px">Ostoskori</DrawerHeader>

        <DrawerBody>
          <SubmitConfirmation
            isOpen={ConfirmationDialog.isOpen}
            onClose={ConfirmationDialog.onClose}
            closeDrawer={onClose}
          />
          <Stack spacing={4}>
            <Box>
              <FormLabel htmlFor="description">Kuvaus</FormLabel>
              <Input
                ref={firstField}
                id="description"
                name="description"
                placeholder="Kuvaus"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                }}
              />
            </Box>
            <Box>
              <FormLabel htmlFor="startTime">Alku</FormLabel>
              <Input
                id="startTime"
                value={timeStringWithoutTimeZone(startTime)}
                readOnly
              />
            </Box>
            <Box>
              <FormLabel htmlFor="endTime">Loppu</FormLabel>
              <Input
                id="endTime"
                value={timeStringWithoutTimeZone(endTime)}
                readOnly
              />
            </Box>
          </Stack>

          {cart.items.length > 0 ? (
            <Stack spacing="24px">
              <Heading as="h3" size="md">
                Valitut kamat
              </Heading>
              {cart.items.map(
                (item) =>
                  item.amount > 0 && (
                    <Box key={item.id}>
                      <FormLabel htmlFor={`item-${item.id}`}>
                        {item.name}
                      </FormLabel>
                      <InputGroup>
                        <InputLeftAddon>
                          <IconButton
                            icon={<FaMinus />}
                            aria-label="decrement"
                            onClick={() => decrementAmount(item.id)}
                          />
                        </InputLeftAddon>
                        <Input id={`item-${item.id}`} value={item.amount} />
                        <InputRightAddon>
                          <IconButton
                            icon={<FaPlus />}
                            aria-label="increment"
                            onClick={() => incrementAmount(item.id)}
                            isDisabled={
                              availabilities[item.id].available -
                                getCartAmount(item.id) <
                              1
                            }
                          />
                        </InputRightAddon>
                      </InputGroup>
                    </Box>
                  )
              )}
            </Stack>
          ) : (
            <Heading as="h3" size="md">
              Ostoskori on tyhjä
            </Heading>
          )}
        </DrawerBody>

        <DrawerFooter borderTopWidth="1px">
          <Button variant="outline" mr={3} onClick={onClose}>
            Sulje
          </Button>
          <Button
            colorScheme="blue"
            onClick={ConfirmationDialog.onOpen}
            isDisabled={cart.items.length == 0}
          >
            Varaa
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
