import React from "react";
import { IconButton } from "@chakra-ui/react";
import { FaShoppingCart } from "react-icons/fa";
import { useDates } from "@/contexts/DatesContext";

interface CartButtonProps {
  onOpen: () => void;
  onClose: () => void;
  isOpen: boolean;
}

export default function CartButton({
  onOpen,
  onClose,
  isOpen,
}: CartButtonProps) {
  const { state: dates } = useDates();

  return (
    <IconButton
      aria-label="open cart"
      colorScheme="blue"
      onClick={isOpen ? onClose : onOpen}
      disabled={!dates.datesSet}
    >
      <FaShoppingCart />
    </IconButton>
  );
}
