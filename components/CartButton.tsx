'use client';

import React from 'react';
import { FaShoppingCart } from 'react-icons/fa';
import { useDates } from '@/contexts/DatesContext';
import { Button } from '@/components/ui/button';

interface CartButtonProps {
  onOpen: () => void;
  onClose: () => void;
  isOpen: boolean;
}

export default function CartButton({ onOpen, onClose, isOpen }: CartButtonProps) {
  const { state: dates } = useDates();

  return (
    <Button
      aria-label="open cart"
      size="icon"
      onClick={isOpen ? onClose : onOpen}
      disabled={!dates.datesSet}
    >
      <FaShoppingCart />
    </Button>
  );
}
