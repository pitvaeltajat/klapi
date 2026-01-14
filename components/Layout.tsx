import React, { ReactNode } from "react";
import TopBar from "./TopBar";
import CartDrawer from "./CartDrawer";
import CartButton from "./CartButton";
import { useDisclosure, Container } from "@chakra-ui/react";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { open, onOpen, onClose } = useDisclosure();

  return (
    <>
      <TopBar>
        <CartButton onOpen={onOpen} onClose={onClose} isOpen={open} />
      </TopBar>
      <CartDrawer isOpen={open} onClose={onClose} />
      <Container as="main" maxW="container.xl" px={4} py={8} mt={20}>
        {children}
      </Container>
    </>
  );
}
