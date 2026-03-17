import DatePicker from 'react-datepicker';
import { Box, VStack, FormControl, FormLabel, Grid, GridItem, useColorModeValue, Text, HStack } from '@chakra-ui/react';
import 'react-datepicker/dist/react-datepicker.css';

import React from 'react';
import { useDates } from '@/contexts/DatesContext';
import { useCart } from '@/contexts/CartContext';
import LoanerAutocomplete from './LoanerAutocomplete';

function formatDateTime(date: Date): string {
  return date.toLocaleDateString('fi-FI', {
    weekday: 'short',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  }) + ' klo ' + date.toLocaleTimeString('fi-FI', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function KioskDateSelector() {
  const { state: dates, setEndDate } = useDates();
  const { state: cart, setLoaner, setUserId } = useCart();
  const cardBg = useColorModeValue('white', 'gray.800');
  const datePickerHeaderBg = useColorModeValue('white', 'gray.700');
  const datePickerBorderColor = useColorModeValue('gray.200', 'gray.600');
  const datePickerHoverBg = useColorModeValue('gray.100', 'gray.600');
  const summaryBg = useColorModeValue('blue.50', 'blue.900');
  const summaryBorderColor = useColorModeValue('blue.200', 'blue.700');

  // Helper function to set default time to 18:00
  const setDefaultTime = (date: Date): Date => {
    const newDate = new Date(date);
    newDate.setHours(18, 0, 0, 0);
    return newDate;
  };

  const handleLoanerChange = (value: string, userId?: string) => {
    setLoaner(value);
    setUserId(userId);
  };

  const handleDateChange = (date: Date | null) => {
    if (date) {
      const today = new Date();
      const isToday =
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();

      if (isToday) {
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 0, 0);
        setEndDate(endOfDay);
      } else {
        setEndDate(setDefaultTime(date));
      }
    }
  };

  return (
    <>
    <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={4} mb={4} alignItems="start">
      {/* Left column - Loaner info */}
      <GridItem>
        <Box borderWidth="1px" borderRadius="lg" p={6} bg={cardBg} boxShadow="sm" height="full">
          <FormControl>
            <FormLabel fontWeight="bold" fontSize="lg" mb={4}>
              Lainaaja
            </FormLabel>
            <LoanerAutocomplete
              value={cart.loaner || ''}
              onChange={handleLoanerChange}
              placeholder="Syötä nimi tai valitse sähköposti"
              size="lg"
              showValidationFeedback
            />
          </FormControl>
        </Box>
      </GridItem>

      {/* Right column - Return date */}
      <GridItem>
        <Box borderWidth="1px" borderRadius="lg" p={6} bg={cardBg} boxShadow="sm" height="full">
          <FormControl>
            <FormLabel fontWeight="bold" fontSize="lg" mb={2}>
              Palautuspäivä
            </FormLabel>
            <VStack align="stretch" spacing={3}>
              <Box
                sx={{
                  '.react-datepicker': {
                    border: 'none',
                    fontFamily: 'inherit',
                  },
                  '.react-datepicker__header': {
                    backgroundColor: datePickerHeaderBg,
                    borderBottom: '1px solid',
                    borderColor: datePickerBorderColor,
                  },
                  '.react-datepicker__day--selected': {
                    backgroundColor: 'blue.500',
                    color: 'white',
                  },
                  '.react-datepicker__day--keyboard-selected': {
                    backgroundColor: 'blue.100',
                  },
                  '.react-datepicker__day:hover': {
                    backgroundColor: datePickerHoverBg,
                  },
                }}
              >
                <DatePicker
                  selected={dates.endDate}
                  onChange={handleDateChange}
                  inline
                  minDate={new Date()}
                  dateFormat="dd.MM.yyyy"
                />
              </Box>
            </VStack>
          </FormControl>
        </Box>
      </GridItem>
    </Grid>

      {/* Loan period summary */}
      <Box
        borderWidth="1px"
        borderRadius="lg"
        p={4}
        mb={4}
        bg={summaryBg}
        borderColor={summaryBorderColor}
      >
        <HStack spacing={3} justify="center" wrap="wrap">
          <VStack spacing={0}>
            <Text fontSize="xs" color="gray.500" fontWeight="medium">
              Laina alkaa
            </Text>
            <Text fontSize="lg" fontWeight="bold">
              {formatDateTime(dates.startDate)}
            </Text>
          </VStack>
          <Text fontSize="xl" color="gray.400" px={2}>
            &rarr;
          </Text>
          <VStack spacing={0}>
            <Text fontSize="xs" color="gray.500" fontWeight="medium">
              Palautus viimeistään
            </Text>
            <Text fontSize="lg" fontWeight="bold">
              {formatDateTime(dates.endDate)}
            </Text>
          </VStack>
        </HStack>
      </Box>
    </>
  );
}
