import { Box, FormLabel, Input } from "@chakra-ui/react";
import { useCartDescription } from "@/contexts/CartContext";
import { useCallback } from "react";

export function CartDescriptionInput({
  inputRef,
}: {
  inputRef: React.RefObject<HTMLInputElement>;
}) {
  const { description, setDescription } = useCartDescription();

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setDescription(e.target.value);
    },
    [setDescription]
  );

  return (
    <Box>
      <FormLabel htmlFor="description">Kuvaus</FormLabel>
      <Input
        ref={inputRef}
        id="description"
        name="description"
        placeholder="Kuvaus"
        value={description}
        onChange={handleChange}
      />
    </Box>
  );
}
