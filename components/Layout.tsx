import React, { ReactNode } from "react";
import TopBar from "./TopBar";
import CartDrawer from "./CartDrawer";
import CartButton from "./CartButton";
import { useDisclosure, Box } from "@chakra-ui/react";

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
      <Box as="main" padding={10} paddingTop={20} margin="auto">
        {children}
      </Box>
    </>
  );
}
