import {
  Box,
  Button,
  Heading,
  VStack,
  FormControl,
  FormLabel,
  FormHelperText,
  Text,
  useColorModeValue,
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
  const bgColor = useColorModeValue("blue.50", "blue.900");
  const borderColor = useColorModeValue("blue.200", "blue.700");

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
      <VStack spacing={6} align="stretch">
        <Heading mb={3}>Tervetuloa kalustoon!</Heading>
        <Box
          bg={bgColor}
          borderWidth="1px"
          borderColor={borderColor}
          borderRadius="lg"
          p={5}
          shadow="sm"
          fontSize="md"
          lineHeight="tall"
          color={useColorModeValue("gray.700", "gray.200")}
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

        <FormControl required>
          <FormLabel>Lainaajan nimi</FormLabel>
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
          <FormHelperText>
            <Text>
              Laina alkaa heti ja voit valita palautuspäivän seuraavassa
              vaiheessa.
            </Text>
          </FormHelperText>
        </FormControl>

        <HStack spacing={4}>
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
