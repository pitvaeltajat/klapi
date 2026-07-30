'use client';

import React from 'react';
import { ShoppingCart } from 'lucide-react';
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
      data-cart-button
      onPointerDown={(e) => e.stopPropagation()}
      onClick={isOpen ? onClose : onOpen}
      disabled={!dates.datesSet}
    >
      <ShoppingCart className="h-4 w-4" />
    </Button>
  );
}
