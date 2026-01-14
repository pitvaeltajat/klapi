import DatePicker from "react-datepicker";
import {
  Box,
  Button,
  Heading,
  VStack,
  HStack,
  Text,
  FormControl,
  FormLabel,
} from "@chakra-ui/react";
import "react-datepicker/dist/react-datepicker.css";

import React from "react";
import { useState } from "react";
import { useRouter } from "next/router";
import { useDates } from "@/contexts/DatesContext";
import { useCart } from "@/contexts/CartContext";
import {
  cardStyles,
  headingSizes,
  spacing,
  buttonColors,
} from "@/styles/designTokens";

export default function DateSelector() {
  const { state: dates, setStartDate, setEndDate, setDatesSet } = useDates();
  const { clearCart } = useCart();
  const router = useRouter();

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

  function applyDates() {
    clearCart();

    if (startDate && endDate) {
      setStartDate(startDate);
      setEndDate(endDate);
      setDatesSet(true);
    }
  }

  return (
    <VStack gap={spacing.sectionSpacing} align="stretch">
      {!dates.datesSet ? (
        <>
          <Box>
            <Heading size={headingSizes.pageTitle} mb={spacing.tightSpacing}>
              Aloitus
            </Heading>
            <Text color="gray.600">
              Aloita valitsemalla kamojen nouto- ja palautusajankohdat.
            </Text>
          </Box>

          <Box {...cardStyles.base}>
            <FormControl>
              <FormLabel fontWeight="bold" mb={spacing.tightSpacing}>
                Valitse lainausaika
              </FormLabel>
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
                dateFormat="dd.MM.yyyy"
              />
              <Button
                colorScheme={buttonColors.primary}
                mt={spacing.elementSpacing}
                width="full"
                disabled={!startDate || !endDate}
                onClick={applyDates}
              >
                Vahvista ajankohta
              </Button>
            </FormControl>
          </Box>

          <Text textAlign="center" fontWeight="medium">
            Tai
          </Text>
          <Button variant="outline" onClick={() => router.push("/item/browse")}>
            Selaa kaikkia kamoja
          </Button>
        </>
      ) : (
        <>
          <Box>
            <Heading
              as="h2"
              size={headingSizes.sectionTitle}
              mb={spacing.elementSpacing}
            >
              Valitut päivämäärät
            </Heading>
          </Box>

          <Box {...cardStyles.base}>
            <VStack align="stretch" gap={spacing.elementSpacing}>
              <HStack gap={spacing.tightSpacing}>
                <Text fontWeight="bold">Nouto:</Text>
                <Text>
                  {dates.startDate.toLocaleDateString("fi-FI", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </Text>
              </HStack>
              <HStack gap={spacing.tightSpacing}>
                <Text fontWeight="bold">Palautus:</Text>
                <Text>
                  {dates.endDate.toLocaleDateString("fi-FI", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </Text>
              </HStack>

              <Box pt={spacing.tightSpacing}>
                <FormLabel fontWeight="bold" mb={spacing.tightSpacing}>
                  Muokkaa aikaa
                </FormLabel>
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
                  inline
                  minDate={new Date()}
                  dateFormat="dd.MM.yyyy"
                />
              </Box>
            </VStack>
          </Box>
        </>
      )}
    </VStack>
  );
}
