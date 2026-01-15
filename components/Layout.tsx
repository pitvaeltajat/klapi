import React, { ReactNode } from "react";
import TopBar from "./TopBar";
import CartDrawer from "./CartDrawer";
import CartButton from "./CartButton";
import { useDisclosure, Container } from "@chakra-ui/react";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <>
      <TopBar>
        <CartButton onOpen={onOpen} onClose={onClose} isOpen={isOpen} />
      </TopBar>
      <CartDrawer isOpen={isOpen} onClose={onClose} />
      <Container as="main" maxW="container.xl" px={4} py={10}>
        {children}
      </Container>
    </>
  );
}
