import {
  Heading,
  Flex,
  Box,
  IconButton,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerOverlay,
  TableContainer,
  Table,
  Tbody,
  Tr,
  Td,
  Link,
  Container,
} from "@chakra-ui/react";
import { FaBars } from "react-icons/fa";
import NextLink from "next/link";
import { useSession } from "next-auth/react";
import { useDisclosure } from "@chakra-ui/react";
import { ReactNode } from "react";

export default function TopBar({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const role = session?.user?.group;
  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <>
      <Box
        as="header"
        position="fixed"
        top={0}
        left={0}
        right={0}
        bg="rgba(66,131,209,0.9)"
        backdropFilter="auto"
        backdropBlur="4px"
        zIndex={1000}
        boxShadow="sm"
      >
        <Container maxW="container.xl" px={4}>
          <Flex h="4rem" align="center" justify="space-between" color="white">
            <Flex align="center" gap={4}>
              <IconButton
                aria-label="open menu"
                icon={<FaBars />}
                colorScheme="blue"
                onClick={isOpen ? onClose : onOpen}
                display={["block", "block", "none"]}
              />

              <Link as={NextLink} href="/" _hover={{ textDecoration: "none" }}>
                <Heading size="lg">KLAPI</Heading>
              </Link>
            </Flex>

            <Flex gap={6} align="center" display={["none", "none", "flex"]}>
              {role === "ADMIN" && (
                <>
                  <Link as={NextLink} href="/loan" fontWeight="medium">
                    Varaukset
                  </Link>
                  <Link as={NextLink} href="/admin" fontWeight="medium">
                    Hallinta
                  </Link>
                </>
              )}
              <Link as={NextLink} href="/account" fontWeight="medium">
                Oma tili
              </Link>
              {children}
            </Flex>

            <Box display={["block", "block", "none"]}>{children}</Box>
          </Flex>
        </Container>
      </Box>
      <Box h="4rem" />{" "}
      <Drawer placement="top" onClose={onClose} isOpen={isOpen}>
        <DrawerOverlay />
        <DrawerContent>
          <DrawerBody pt="4rem">
            <TableContainer>
              <Table variant="simple">
                <Tbody>
                  <Tr>
                    <Td>
                      <Link as={NextLink} href="/loan" onClick={onClose}>
                        Varaukset
                      </Link>
                    </Td>
                  </Tr>
                  <Tr>
                    <Td>
                      <Link as={NextLink} href="/admin" onClick={onClose}>
                        Hallinta
                      </Link>
                    </Td>
                  </Tr>
                  <Tr>
                    <Td>
                      <Link as={NextLink} href="/account" onClick={onClose}>
                        Oma tili
                      </Link>
                    </Td>
                  </Tr>
                </Tbody>
              </Table>
            </TableContainer>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
}
