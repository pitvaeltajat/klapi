import DatePicker from "react-datepicker";
import {
  Box,
  VStack,
  FormControl,
  FormLabel,
  Grid,
  GridItem,
} from "@chakra-ui/react";
import "react-datepicker/dist/react-datepicker.css";

import React from "react";
import { useDates } from "@/contexts/DatesContext";
import { useCart } from "@/contexts/CartContext";
import LoanerAutocomplete from "./LoanerAutocomplete";

export default function KioskDateSelector() {
  const { state: dates, setEndDate } = useDates();
  const { state: cart, setLoaner, setUserId } = useCart();

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
      setEndDate(setDefaultTime(date));
    }
  };

  return (
    <Grid
      templateColumns={{ base: "1fr", lg: "1fr 1fr" }}
      gap={4}
      mb={4}
      alignItems="start"
    >
      {/* Left column - Loaner info */}
      <GridItem>
        <Box
          borderWidth="1px"
          borderRadius="lg"
          p={6}
          bg="white"
          boxShadow="sm"
          height="full"
        >
          <FormControl>
            <FormLabel fontWeight="bold" fontSize="lg" mb={4}>
              Lainaaja
            </FormLabel>
            <LoanerAutocomplete
              value={cart.loaner || ""}
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
        <Box
          borderWidth="1px"
          borderRadius="lg"
          p={6}
          bg="white"
          boxShadow="sm"
          height="full"
        >
          <FormControl>
            <FormLabel fontWeight="bold" fontSize="lg" mb={2}>
              Palautuspäivä
            </FormLabel>
            <VStack align="stretch" spacing={3}>
              <Box
                sx={{
                  ".react-datepicker": {
                    border: "none",
                    fontFamily: "inherit",
                  },
                  ".react-datepicker__header": {
                    backgroundColor: "white",
                    borderBottom: "1px solid",
                    borderColor: "gray.200",
                  },
                  ".react-datepicker__day--selected": {
                    backgroundColor: "blue.500",
                    color: "white",
                  },
                  ".react-datepicker__day--keyboard-selected": {
                    backgroundColor: "blue.100",
                  },
                  ".react-datepicker__day:hover": {
                    backgroundColor: "gray.100",
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
  );
}
