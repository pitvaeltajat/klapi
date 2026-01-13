import {
  Box,
  Button,
  Heading,
  Input,
  VStack,
  FormControl,
  FormLabel,
  FormHelperText,
} from "@chakra-ui/react";
import React, { useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { useDates } from "@/contexts/DatesContext";

export default function KioskModeSelector() {
  const [loaner, setLoaner] = useState("");
  const { setLoaner: setCartLoaner } = useCart();
  const { setStartDate, setEndDate, setDatesSet } = useDates();

  const handleSubmit = () => {
    if (loaner.trim()) {
      // Set the loaner in cart context
      setCartLoaner(loaner);

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
        <Heading size="lg" textAlign="center">
          Kioskitila
        </Heading>

        <FormControl isRequired>
          <FormLabel>Lainaajan nimi</FormLabel>
          <Input
            placeholder="Syötä nimesi"
            value={loaner}
            onChange={(e) => setLoaner(e.target.value)}
            size="lg"
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                handleSubmit();
              }
            }}
          />
          <FormHelperText>
            Anna nimesi aloittaaksesi lainauksen. Laina alkaa heti ja voit valita palautuspäivän seuraavassa vaiheessa.
          </FormHelperText>
        </FormControl>

        <Button
          colorScheme="blue"
          size="lg"
          onClick={handleSubmit}
          isDisabled={!loaner.trim()}
        >
          Jatka
        </Button>
      </VStack>
    </Box>
  );
}
