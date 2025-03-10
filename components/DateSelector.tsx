import { useDispatch, useSelector } from "react-redux";
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
import { setStartDate, setEndDate, datesSet } from "../redux/dates.slice";
import { clearCart } from "../redux/cart.slice";
import React from "react";
import { useState } from "react";
import { useRouter } from "next/router";
import type { RootState } from "../redux/store";

export default function DateSelector() {
  const dates = useSelector((state: RootState) => state.dates);
  const dispatch = useDispatch();

  const Ref = React.useRef<HTMLButtonElement>(null);

  const router = useRouter();

  const { isOpen, onOpen, onClose } = useDisclosure();

  const [startDateModified, setStartDateModified] = useState(false);
  const [endDateModified, setEndDateModified] = useState(false);

  const [startDate, setLocalStartDate] = useState<Date | null>(null);
  const [endDate, setLocalEndDate] = useState<Date | null>(null);

  function setDates() {
    dispatch(clearCart());

    if (startDate && endDate) {
      dispatch(setStartDate(startDate));
      dispatch(setEndDate(endDate));
      dispatch(datesSet(true));
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
          </Flex>
        </>
      )}
      <Box>
        <Button onClick={onOpen}>
          {dates.datesSet ? "Muokkaa päivämääriä" : "Aseta Päivämäärät"}
        </Button>
      </Box>
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
              <Box>
                <Heading size="sm" mb={2}>
                  Alkupäivä
                </Heading>
                <DatePicker
                  selected={startDate}
                  onChange={(date: Date | null) => {
                    if (date) {
                      setLocalStartDate(date);
                      setStartDateModified(true);
                    }
                  }}
                  selectsStart
                  startDate={startDate}
                  endDate={endDate}
                  minDate={new Date()}
                  dateFormat="dd.MM.yyyy"
                />
              </Box>
              <Box mt={4}>
                <Heading size="sm" mb={2}>
                  Loppupäivä
                </Heading>
                <DatePicker
                  selected={endDate}
                  onChange={(date: Date | null) => {
                    if (date) {
                      setLocalEndDate(date);
                      setEndDateModified(true);
                    }
                  }}
                  selectsEnd
                  startDate={startDate}
                  endDate={endDate}
                  minDate={startDate || new Date()}
                  dateFormat="dd.MM.yyyy"
                />
              </Box>
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={Ref} onClick={onClose} ml={3}>
                Peruuta
              </Button>
              <Button
                colorScheme="blue"
                isDisabled={!startDateModified || !endDateModified}
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
