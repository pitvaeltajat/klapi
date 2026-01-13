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
import LoadingSpinner from "./LoadingSpinner";
import { useState } from "react";
import { useEffect } from "react";
import { useCart } from "@/contexts/CartContext";
import { useDates } from "@/contexts/DatesContext";
import { useDelayedLoading } from "@/hooks/useDelayedLoading";

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
    setLoaner,
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
      .catch((error) => {
        console.log(error);
        setLoading(false);
      });
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

  if (loading || !data) {
    if (!showLoading) {
      return null;
    }
    return (
      <Drawer
        isOpen={isOpen}
        placement="right"
        size={{ base: "full", md: "md" }}
        onClose={onClose}
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px">Ostoskori</DrawerHeader>
          <DrawerBody>
            <LoadingSpinner fullWidth />
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    );
  }

  const { availabilities } = data;

  const timeStringWithoutTimeZone = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${day}.${month}.${year} ${hours}:${minutes}`;
  };

  const isDescriptionValid = cart.description.trim().length > 0;

  return (
    <Drawer
      isOpen={isOpen}
      placement="right"
      size={{ base: "full", md: "md" }}
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
          <Stack spacing={1}>
            <Box>
              <FormLabel htmlFor="loaner">Lainaaja</FormLabel>
              <Input
                id="loaner"
                name="loaner"
                placeholder="Lainaajan nimi"
                value={cart.loaner || ""}
                onChange={(e) => {
                  setLoaner(e.target.value);
                }}
              />
            </Box>
            <Box>
              <FormLabel htmlFor="description">
                Kuvaus <span style={{ color: "red" }}>*</span>
              </FormLabel>
              <Input
                ref={firstField}
                id="description"
                name="description"
                placeholder="Kuvaus (pakollinen)"
                value={cart.description}
                onChange={(e) => {
                  setDescription(e.target.value);
                }}
                isRequired
                isInvalid={!isDescriptionValid && cart.items.length > 0}
              />
            </Box>
            <Box>
              <FormLabel htmlFor="startTime">Lainaus alkaa</FormLabel>
              <Input
                id="startTime"
                value={timeStringWithoutTimeZone(startTime)}
                readOnly
              />
            </Box>
            <Box>
              <FormLabel htmlFor="endTime">Lainaus loppuu</FormLabel>
              <Input
                id="endTime"
                value={timeStringWithoutTimeZone(endTime)}
                readOnly
              />
            </Box>
          </Stack>

          {cart.items.length > 0 ? (
            <Stack spacing={2} marginTop="20px">
              <Heading as="h3" size="md">
                Valitut tavarat
              </Heading>
              {cart.items.map(
                (item) =>
                  item.amount > 0 && (
                    <Box key={item.id}>
                      <FormLabel htmlFor={`item-${item.id}`}>
                        {item.name}
                      </FormLabel>
                      <InputGroup size="md">
                        <InputLeftAddon width="8%" padding={0}>
                          <IconButton
                            icon={<FaMinus />}
                            aria-label="decrement"
                            onClick={() => decrementAmount(item.id)}
                            width="100%"
                          />
                        </InputLeftAddon>
                        <Input
                          id={`item-${item.id}`}
                          value={item.amount}
                          readOnly
                          textAlign="center"
                        />
                        <InputRightAddon width="8%" padding={0}>
                          <IconButton
                            icon={<FaPlus />}
                            aria-label="increment"
                            onClick={() => incrementAmount(item.id)}
                            width="100%"
                            isDisabled={
                              !availabilities[item.id] ||
                              getCartAmount(item.id) >=
                                availabilities[item.id].available
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
            isDisabled={cart.items.length === 0 || !isDescriptionValid}
          >
            Varaa
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
