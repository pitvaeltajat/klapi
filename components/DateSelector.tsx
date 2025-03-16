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
  Text,
} from "@chakra-ui/react";
import "react-datepicker/dist/react-datepicker.css";
import { FaEdit } from "react-icons/fa";

import React from "react";
import { useState } from "react";
import { useRouter } from "next/router";
import { useDates } from "@/contexts/DatesContext";
import { useCart } from "@/contexts/CartContext";

export default function DateSelector() {
  const { state: dates, setStartDate, setEndDate, setDatesSet } = useDates();
  const { clearCart } = useCart();

  const Ref = React.useRef<HTMLButtonElement>(null);

  const router = useRouter();

  const { isOpen, onOpen, onClose } = useDisclosure();

  // Combine the date states into a single array
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    null,
    null,
  ]);
  const [startDate, endDate] = dateRange;

  // Helper function to set default time to 18:00
  const setDefaultTime = (date: Date): Date => {
    const newDate = new Date(date);
    newDate.setHours(18, 0, 0);
    return newDate;
  };

  function setDates() {
    clearCart();

    if (startDate && endDate) {
      setStartDate(startDate);
      setEndDate(endDate);
      setDatesSet(true);
    }

    onClose();
  }

  return (
    <>
      {!dates.datesSet ? (
        <>
          <Heading>Aloitus</Heading>
          <Box>
            Aloita valitsemalla kamojen nouto- ja palautusajankohdat. Huomioi
            aikoja valitessasi, että lähtökohtaisesti kamoja voi noutaa vain
            kalustopäivystyksestä maanantaisin klo 18-19.
          </Box>
          <Box>
            <Button onClick={onOpen}>Aseta ajankohta</Button>
          </Box>
        </>
      ) : (
        <>
          <Heading as={"h2"} size="md">
            Valitut päivämäärät:
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
                  Nouto:
                </Box>
                <Box as={"span"} ml={2}>
                  {dates.startDate.toLocaleDateString("fi-FI", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </Box>
              </Box>
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
        </>
      )}

      {!dates.datesSet ? (
        <>
          <Text>Tai</Text>
          <Box>
            <Button
              marginBottom={"1em"}
              onClick={() => router.push("/item/browse")}
            >
              Selaa kaikkia kamoja
            </Button>
          </Box>
        </>
      ) : null}

      <AlertDialog isOpen={isOpen} leastDestructiveRef={Ref} onClose={onClose}>
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Valitse lainausaika
            </AlertDialogHeader>

            <AlertDialogBody>
              <DatePicker
                selected={startDate}
                onChange={(update: [Date | null, Date | null]) => {
                  if (update[0]) update[0] = setDefaultTime(update[0]);
                  if (update[1]) update[1] = setDefaultTime(update[1]);
                  setDateRange(update);
                }}
                startDate={startDate}
                endDate={endDate}
                selectsRange
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
                isDisabled={!startDate || !endDate}
                onClick={() => setDates()}
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
