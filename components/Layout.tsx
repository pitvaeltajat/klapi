import React, { ReactNode, useState } from 'react';
import TopBar from './TopBar';
import CartDrawer from './CartDrawer';
import CartButton from './CartButton';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [isOpen, setIsOpen] = useState(false);
  const onOpen = () => setIsOpen(true);
  const onClose = () => setIsOpen(false);

  return (
    <>
      <TopBar>
        <CartButton onOpen={onOpen} onClose={onClose} isOpen={isOpen} />
      </TopBar>
      <CartDrawer isOpen={isOpen} onClose={onClose} />
      <main className="container mx-auto px-4 py-10">{children}</main>
    </>
  );
}
