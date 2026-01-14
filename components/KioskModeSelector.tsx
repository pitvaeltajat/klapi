import {
  Box,
  Button,
  Heading,
  VStack,
  Field,
  Text,
  HStack,
} from "@chakra-ui/react";
import React, { useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { useDates } from "@/contexts/DatesContext";
import { useRouter } from "next/router";
import LoanerAutocomplete from "./LoanerAutocomplete";

export default function KioskModeSelector() {
  const [loaner, setLoaner] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>();
  const { setLoaner: setCartLoaner, setUserId: setCartUserId } = useCart();
  const { setStartDate, setEndDate, setDatesSet } = useDates();
  const router = useRouter();

  const handleLoanerChange = (value: string, userId?: string) => {
    setLoaner(value);
    setSelectedUserId(userId);
  };

  const handleSubmit = () => {
    if (loaner.trim()) {
      // Set the loaner text in cart context
      setCartLoaner(loaner);
      // Set the userId if a user was selected, otherwise undefined (freeform entry)
      setCartUserId(selectedUserId);

      // Set dates to now and one week from now as defaults for kiosk mode
      const now = new Date();
      const oneWeekLater = new Date();
      oneWeekLater.setDate(oneWeekLater.getDate() + 7);
      oneWeekLater.setHours(18, 0, 0, 0);

      setStartDate(now);
      setEndDate(oneWeekLater);
      setDatesSet(true);
    }
  };

  return (
    <Box maxW="500px" mx="auto" mt={8} p={6}>
      <VStack gap={6} align="stretch">
        <Heading mb={3}>Tervetuloa kalustoon!</Heading>
        <Box
          bg="blue.50"
          borderWidth="1px"
          borderColor="blue.200"
          borderRadius="lg"
          p={5}
          shadow="sm"
          fontSize="md"
          lineHeight="tall"
        >
          <Text mb={3}>
            Merkkaa Klapiin jokainen tavara jonka lainaat. Jos tavara ei löydy
            Klapista, voit lisätä sen itse varauksen yhteydessä.
          </Text>
          <Text mb={3}>
            Palauta tavarat sovittuna ajankohtana hyvässä kunnossa.
          </Text>
          <Text>
            Mikäli sinulle tulee jotain kysyttävää, ota yhteyttä
            kalustonhoitajaan: 044 987 7397
          </Text>
        </Box>

        <Field.Root required>
          <Field.Label>Lainaajan nimi</Field.Label>
          <LoanerAutocomplete
            value={loaner}
            onChange={handleLoanerChange}
            placeholder="Syötä nimesi tai valitse sähköposti"
            size="lg"
            isRequired
            showValidationFeedback
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                handleSubmit();
              }
            }}
          />
          <Field.HelperText>
            Laina alkaa heti ja voit valita palautuspäivän seuraavassa
            vaiheessa.
          </Field.HelperText>
        </Field.Root>

        <HStack gap={4}>
          <Button
            colorScheme="blue"
            size="lg"
            onClick={handleSubmit}
            disabled={!loaner.trim()}
            flex={1}
          >
            Lainaa
          </Button>
          <Button
            colorScheme="green"
            size="lg"
            onClick={() => router.push("/kiosk/return")}
            flex={1}
          >
            Palauta
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
}
