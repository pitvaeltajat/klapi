import DatePicker from 'react-datepicker';
import {
  Box,
  Button,
  Heading,
  VStack,
  HStack,
  Text,
  FormControl,
  FormLabel,
  useColorModeValue,
} from '@chakra-ui/react';
import 'react-datepicker/dist/react-datepicker.css';

import React from 'react';
import { useState } from 'react';
import { useDates } from '@/contexts/DatesContext';
import { useCart } from '@/contexts/CartContext';

export default function DateSelector() {
  const { state: dates, setStartDate, setEndDate, setDatesSet, setBrowseMode } = useDates();
  const { clearCart } = useCart();
  const cardBg = useColorModeValue('white', 'gray.800');
  const datePickerBg = useColorModeValue('white', 'gray.700');
  const datePickerHeaderBg = useColorModeValue('white', 'gray.700');
  const datePickerBorderColor = useColorModeValue('gray.200', 'gray.600');
  const datePickerHoverBg = useColorModeValue('gray.100', 'gray.600');
  const datePickerTextColor = useColorModeValue('gray.800', 'white');
  const datePickerDayColor = useColorModeValue('gray.800', 'gray.100');

  // Combine the date states into a single array
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [startDate, endDate] = dateRange;

  // Helper function to set default time to 18:00
  const setDefaultTime = (date: Date): Date => {
    const newDate = new Date(date);
    newDate.setHours(18, 0, 0);
    return newDate;
  };

  function applyDates() {
    clearCart();

    if (startDate && endDate) {
      setStartDate(startDate);
      setEndDate(endDate);
      setDatesSet(true);
    }
  }

  return (
    <VStack spacing={4} align="stretch" mb={4}>
      {!dates.datesSet ? (
        <>
          <Box>
            <Heading size="lg" mb={2}>
              Aloitus
            </Heading>
            <Text color="gray.600">Aloita valitsemalla kamojen nouto- ja palautusajankohdat.</Text>
          </Box>

          <Box borderWidth="1px" borderRadius="lg" p={4} bg={cardBg} boxShadow="sm">
            <FormControl>
              <FormLabel fontWeight="bold">Valitse lainausaika</FormLabel>
              <Box
                sx={{
                  '.react-datepicker': {
                    border: 'none',
                    fontFamily: 'inherit',
                    backgroundColor: datePickerBg,
                    color: datePickerTextColor,
                  },
                  '.react-datepicker__header': {
                    backgroundColor: datePickerHeaderBg,
                    borderBottom: '1px solid',
                    borderColor: datePickerBorderColor,
                  },
                  '.react-datepicker__current-month, .react-datepicker__day-name': {
                    color: datePickerTextColor,
                  },
                  '.react-datepicker__day': {
                    color: datePickerDayColor,
                  },
                  '.react-datepicker__day--selected, .react-datepicker__day--in-range': {
                    backgroundColor: 'blue.500',
                    color: 'white',
                  },
                  '.react-datepicker__day--keyboard-selected': {
                    backgroundColor: 'blue.100',
                  },
                  '.react-datepicker__day:hover': {
                    backgroundColor: datePickerHoverBg,
                  },
                  '.react-datepicker__day--disabled': {
                    color: 'gray.400',
                  },
                }}
              >
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
                  swapRange
                  inline
                  minDate={new Date()}
                  dateFormat="dd.MM.yyyy"
                />
              </Box>
              <Button
                colorScheme="blue"
                mt={4}
                width="full"
                isDisabled={!startDate || !endDate}
                onClick={applyDates}
              >
                Vahvista ajankohta
              </Button>
              <Button
                variant="outline"
                mt={2}
                width="full"
                onClick={() => setBrowseMode(true)}
              >
                Selaa katalogia ilman varausta
              </Button>
            </FormControl>
          </Box>
        </>
      ) : (
        <>
          <Box>
            <Heading as="h2" size="md" mb={3}>
              Valitut päivämäärät
            </Heading>
          </Box>

          <Box borderWidth="1px" borderRadius="lg" p={4} bg={cardBg} boxShadow="sm">
            <VStack align="stretch" spacing={3}>
              <HStack spacing={2}>
                <Text fontWeight="bold">Nouto:</Text>
                <Text>
                  {dates.startDate.toLocaleDateString('fi-FI', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </Text>
              </HStack>
              <HStack spacing={2}>
                <Text fontWeight="bold">Palautus:</Text>
                <Text>
                  {dates.endDate.toLocaleDateString('fi-FI', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </Text>
              </HStack>

              <Box pt={2}>
                <FormLabel fontWeight="bold">Muokkaa aikaa</FormLabel>
                <Box
                  sx={{
                    '.react-datepicker': {
                      border: 'none',
                      fontFamily: 'inherit',
                      backgroundColor: datePickerBg,
                      color: datePickerTextColor,
                    },
                    '.react-datepicker__header': {
                      backgroundColor: datePickerHeaderBg,
                      borderBottom: '1px solid',
                      borderColor: datePickerBorderColor,
                    },
                    '.react-datepicker__current-month, .react-datepicker__day-name': {
                      color: datePickerTextColor,
                    },
                    '.react-datepicker__day': {
                      color: datePickerDayColor,
                    },
                    '.react-datepicker__day--selected, .react-datepicker__day--in-range': {
                      backgroundColor: 'blue.500',
                      color: 'white',
                    },
                    '.react-datepicker__day--keyboard-selected': {
                      backgroundColor: 'blue.100',
                    },
                    '.react-datepicker__day:hover': {
                      backgroundColor: datePickerHoverBg,
                    },
                    '.react-datepicker__day--disabled': {
                      color: 'gray.400',
                    },
                  }}
                >
                  <DatePicker
                    selected={dates.startDate}
                    onChange={(update: [Date | null, Date | null]) => {
                      if (update[0]) {
                        update[0] = setDefaultTime(update[0]);
                        setStartDate(update[0]);
                      }
                      if (update[1]) {
                        update[1] = setDefaultTime(update[1]);
                        setEndDate(update[1]);
                      }
                    }}
                    startDate={dates.startDate}
                    endDate={dates.endDate}
                    selectsRange
                    swapRange
                    inline
                    minDate={new Date()}
                    dateFormat="dd.MM.yyyy"
                  />
                </Box>
                <Button
                  variant="outline"
                  mt={4}
                  width="full"
                  onClick={() => {
                    clearCart();
                    setDatesSet(false);
                  }}
                >
                  Nollaa päivät
                </Button>
              </Box>
            </VStack>
          </Box>
        </>
      )}
    </VStack>
  );
}
