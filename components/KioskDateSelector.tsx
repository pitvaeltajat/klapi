import DatePicker from "react-datepicker";
import {
  Box,
  Button,
  Heading,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
  Flex,
} from "@chakra-ui/react";
import "react-datepicker/dist/react-datepicker.css";
import { FaEdit } from "react-icons/fa";

import React from "react";
import { useState } from "react";
import { useDates } from "@/contexts/DatesContext";
import { useCart } from "@/contexts/CartContext";

export default function KioskDateSelector() {
  const { state: dates, setEndDate } = useDates();
  const { clearCart, state: cart } = useCart();

  const Ref = React.useRef<HTMLButtonElement>(null);

  const { isOpen, onOpen, onClose } = useDisclosure();

  const [returnDate, setReturnDate] = useState<Date | null>(dates.endDate);

  // Helper function to set default time to 18:00
  const setDefaultTime = (date: Date): Date => {
    const newDate = new Date(date);
    newDate.setHours(18, 0, 0, 0);
    return newDate;
  };

  function updateReturnDate() {
    clearCart();

    if (returnDate) {
      setEndDate(returnDate);
    }

    onClose();
  }

  return (
    <>
      <Heading as={"h2"} size="md">
        Lainaaja: {cart.loaner}
      </Heading>
      <Heading as={"h2"} size="md" mt={2}>
        Palautuspäivä:
      </Heading>
      <Flex
        width={"fit-content"}
        borderWidth={"1px"}
        borderRadius="lg"
        marginTop={"0.5em"}
        marginBottom="0.5em"
        cursor="pointer"
        onClick={onOpen}
        align="center"
        _hover={{ bg: "gray.50" }}
      >
        <Box p={4}>
          <Box>
            <Box as={"span"} fontWeight="bold">
              Palautus:
            </Box>
            <Box as={"span"} ml={2}>
              {dates.endDate.toLocaleDateString("fi-FI", {
                weekday: "long",
                month: "long",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </Box>
          </Box>
        </Box>
        <Box p={4} color="gray.500">
          <FaEdit />
        </Box>
      </Flex>

      <AlertDialog isOpen={isOpen} leastDestructiveRef={Ref} onClose={onClose}>
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Valitse palautuspäivä
            </AlertDialogHeader>

            <AlertDialogBody>
              <DatePicker
                selected={returnDate}
                onChange={(date: Date | null) => {
                  if (date) {
                    setReturnDate(setDefaultTime(date));
                  }
                }}
                inline
                minDate={new Date()}
                dateFormat="dd.MM.yyyy HH:mm"
              />
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={Ref} onClick={onClose} ml={3}>
                Peruuta
              </Button>
              <Button
                colorScheme="blue"
                isDisabled={!returnDate}
                onClick={() => updateReturnDate()}
                ml={3}
              >
                Vahvista
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
}
