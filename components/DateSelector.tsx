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
  Card,
  CardBody,
  Stack,
  Divider,
  VStack,
} from "@chakra-ui/react";
import "react-datepicker/dist/react-datepicker.css";
import { FaEdit, FaCalendarAlt } from "react-icons/fa";
import React, { useState } from "react";
import { useRouter } from "next/router";
import { useDates } from "@/contexts/DatesContext";
import { useCart } from "@/contexts/CartContext";

export default function DateSelector() {
  const { state: dates, setStartDate, setEndDate, setDatesSet } = useDates();
  const { clearCart } = useCart();
  const Ref = React.useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    null,
    null,
  ]);
  const [startDate, endDate] = dateRange;

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
        <Card variant="outline" bg="white" shadow="sm">
          <CardBody>
            <VStack spacing={6} align="stretch">
              <Box>
                <Heading size="lg" mb={2}>
                  Aloitus
                </Heading>
                <Text color="gray.600">
                  Aloita valitsemalla kamojen nouto- ja palautusajankohdat.
                  Huomioi aikoja valitessasi, että lähtökohtaisesti kamoja voi
                  noutaa vain kalustopäivystyksestä maanantaisin klo 18-19.
                </Text>
              </Box>

              <Stack direction={["column", "row"]} spacing={4}>
                <Button
                  leftIcon={<FaCalendarAlt />}
                  colorScheme="blue"
                  size="lg"
                  onClick={onOpen}
                >
                  Aseta ajankohta
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => router.push("/item/browse")}
                >
                  Selaa kaikkia kamoja
                </Button>
              </Stack>
            </VStack>
          </CardBody>
        </Card>
      ) : (
        <Card variant="outline" bg="white" shadow="sm" mb={6}>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Heading as="h2" size="md">
                Valitut päivämäärät
              </Heading>

              <Flex
                p={4}
                borderWidth="1px"
                borderRadius="md"
                cursor="pointer"
                onClick={onOpen}
                align="center"
                justify="space-between"
                _hover={{ bg: "gray.50" }}
                transition="all 0.2s"
              >
                <Stack spacing={4}>
                  <Box>
                    <Text fontWeight="bold" mb={1}>
                      Nouto
                    </Text>
                    <Text>
                      {dates.startDate.toLocaleDateString("fi-FI", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </Text>
                  </Box>
                  <Box>
                    <Text fontWeight="bold" mb={1}>
                      Palautus
                    </Text>
                    <Text>
                      {dates.endDate.toLocaleDateString("fi-FI", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </Text>
                  </Box>
                </Stack>
                <Box color="blue.500">
                  <FaEdit size={20} />
                </Box>
              </Flex>
            </VStack>
          </CardBody>
        </Card>
      )}

      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={Ref}
        onClose={onClose}
        size="lg"
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Valitse lainausaika
            </AlertDialogHeader>

            <AlertDialogBody>
              <Box className="custom-datepicker">
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
              </Box>
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={Ref} variant="ghost" onClick={onClose}>
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
