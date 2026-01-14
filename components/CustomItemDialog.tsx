import React from "react";
import { Dialog, Button, Field, Input, NumberInput } from "@chakra-ui/react";

import { toaster } from "@/components/ui/toaster";
import { useCart } from "@/contexts/CartContext";
import { FaCartArrowDown } from "react-icons/fa";
import { spacing, buttonColors } from "@/styles/designTokens";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function CustomItemDialog({ isOpen, onClose }: Props) {
  const [name, setName] = React.useState("");
  const [amount, setAmount] = React.useState<number>(1);
  const { addToCart } = useCart();

  const handleSubmit = () => {
    if (!name.trim()) {
      toaster.create({
        title: "Anna kaman nimi",
        status: "warning",
        duration: 3000,
      });
      return;
    }
    const id = `custom-${Date.now()}`;
    addToCart({ id, name: name.trim(), amount });
    toaster.create({
      title: "Lisätty koriin",
      description: name,
      status: "success",
      duration: 2500,
    });
    setName("");
    setAmount(1);
    onClose();
  };

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(e: any) => !e.open && onClose()}
      placement="center"
    >
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Lisää oma kama varaukseen</Dialog.Title>
            <Dialog.CloseTrigger />
          </Dialog.Header>
          <Dialog.Body>
            <Field.Root mb={spacing.elementSpacing}>
              <Field.Label>Nimi</Field.Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Kaman nimi"
              />
            </Field.Root>
            <Field.Root>
              <Field.Label>Määrä</Field.Label>
              <NumberInput.Root
                min={1}
                value={amount}
                onChange={(val) => setAmount(Number(val))}
              >
                <NumberInput.Input />
              </NumberInput.Root>
            </Field.Root>
          </Dialog.Body>
          <Dialog.Footer>
            <Button
              mr={spacing.elementSpacing}
              onClick={onClose}
              variant="ghost"
              colorScheme={buttonColors.secondary}
            >
              Peruuta
            </Button>
            <Button colorScheme={buttonColors.primary} onClick={handleSubmit}>
              Lisää
              <FaCartArrowDown />
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}
