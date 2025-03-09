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

export default function DateSelector() {
  const dates = useSelector((state) => state.dates);
  const cart = useSelector((state) => state.cart);
  const dispatch = useDispatch();

  const Ref = React.useRef();

  const router = useRouter();

  const { isOpen, onOpen, onClose } = useDisclosure();

  const [startDateModified, setStartDateModified] = useState(false);
  const [endDateModified, setEndDateModified] = useState(false);

  const [startDate, setLocalStartDate] = useState();
  const [endDate, setLocalEndDate] = useState();

  function setDates() {
    dispatch(clearCart());

    dispatch(setStartDate(startDate));
    dispatch(setEndDate(endDate));
    dispatch(datesSet(true));

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
              Valitse varauksen ajankohdat
            </AlertDialogHeader>

            <AlertDialogBody>
              <Heading size={"md"}>Nouto</Heading>
              <Box padding={"4px"} flexDirection="row" display="flex">
                <DatePicker
                  selected={startDateModified ? startDate : false}
                  placeholderText="🗓️ Kamojen noutoaika"
                  onChange={(date) => {
                    const dateWith18 = new Date(date);
                    dateWith18.setHours(18, 0, 0, 0);
                    setLocalStartDate(dateWith18);
                    setStartDateModified(true);
                  }}
                  dateFormat="d.M.yyyy H:mm"
                  shouldCloseOnSelect={true}
                />
              </Box>

              <Heading size={"md"}>Palautus</Heading>
              <Box padding={"4px"}>
                <DatePicker
                  selected={endDateModified ? endDate : false}
                  placeholderText="🗓️ Kamojen palautusaika"
                  onChange={(date) => {
                    const dateWith18 = new Date(date);
                    dateWith18.setHours(18, 0, 0, 0);
                    setLocalEndDate(dateWith18);
                    setEndDateModified(true);
                  }}
                  dateFormat="d.M.yyyy H:mm"
                  shouldCloseOnSelect={true}
                />
              </Box>
              {dates.datesSet
                ? "HUOM! Päivämäärien muokkaaminen tyhjentää ostoskorin"
                : null}
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
