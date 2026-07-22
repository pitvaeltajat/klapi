'use client';

import React, { ReactNode, useState } from 'react';
import { usePageMaxWidth } from '@/lib/pageWidth';
import TopBar from './TopBar';
import CartDrawer from './CartDrawer';
import CartButton from './CartButton';
import CartFab, { useCartFabVisible } from './CartFab';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [isOpen, setIsOpen] = useState(false);
  const onOpen = () => setIsOpen(true);
  const onClose = () => setIsOpen(false);
  const fabVisible = useCartFabVisible(isOpen);
  const maxWidth = usePageMaxWidth();

  return (
    <>
      <TopBar>
        <CartButton onOpen={onOpen} onClose={onClose} isOpen={isOpen} />
      </TopBar>
      <CartDrawer isOpen={isOpen} onClose={onClose} />
      <CartFab onOpen={onOpen} isOpen={isOpen} />
      {/* Extra bottom room while the floating cart is up, so it can't sit on
          top of the last row's "Lisää" button. */}
      <main
        className={cn(
          'mx-auto w-full px-4 pt-10 xl:px-6',
          maxWidth,
          fabVisible ? 'pb-28' : 'pb-10',
        )}
      >
        {children}
      </main>
    </>
  );
}
