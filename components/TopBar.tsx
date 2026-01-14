import {
  Heading,
  Flex,
  Box,
  IconButton,
  Drawer,
  Table,
  Link,
  Container,
  Circle,
  Button,
  useDisclosure,
} from "@chakra-ui/react";
import { FaBars } from "react-icons/fa";
import NextLink from "next/link";
import { useSession } from "next-auth/react";
import { ReactNode } from "react";
import { useCart } from "@/contexts/CartContext";
import { useRouter } from "next/router";

export default function TopBar({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const role = session?.user?.group;
  const { open, onOpen, onClose } = useDisclosure();
  const router = useRouter();

  const {
    state: { items },
  } = useCart();
  const totalItems = items.reduce((sum, item) => sum + item.amount, 0);

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
                colorScheme="whiteAlpha"
                onClick={open ? onClose : onOpen}
                display={["block", "block", "none"]}
                variant="ghost"
                color="white"
                _hover={{ bg: "whiteAlpha.300" }}
                _active={{ bg: "whiteAlpha.400" }}
              />

              <Box>
                <NextLink href="/" passHref legacyBehavior>
                  <Link _hover={{ textDecoration: "none" }}>
                    <Heading size="lg">KLAPI</Heading>
                  </Link>
                </NextLink>
              </Box>
            </Flex>

            <Flex gap={6} align="center" display={["none", "none", "flex"]}>
              {role === "ADMIN" && (
                <>
                  <NextLink href="/loan" passHref legacyBehavior>
                    <Link fontWeight="medium">Varaukset</Link>
                  </NextLink>
                  <NextLink href="/admin/boxes" passHref legacyBehavior>
                    <Link fontWeight="medium">Laatikot</Link>
                  </NextLink>
                  <NextLink href="/admin" passHref legacyBehavior>
                    <Link fontWeight="medium">Admin</Link>
                  </NextLink>
                </>
              )}
              {role === "KIOSK" && (
                <Button
                  colorScheme="green"
                  size="sm"
                  onClick={() => router.push("/kiosk/return")}
                >
                  Palauta
                </Button>
              )}
              <NextLink href="/account" passHref legacyBehavior>
                <Link fontWeight="medium">Oma tili</Link>
              </NextLink>
              <Box position="relative">
                {children}
                {totalItems > 0 && (
                  <Circle
                    position="absolute"
                    right="-12px"
                    top="-12px"
                    marginTop="5px"
                    size="24px"
                    bg="red.500"
                    color="white"
                    fontSize="sm"
                    fontWeight="bold"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    boxShadow="md"
                  >
                    {totalItems}
                  </Circle>
                )}
              </Box>
            </Flex>

            <Box display={["block", "block", "none"]} position="relative">
              {children}
              {totalItems > 0 && (
                <Circle
                  position="absolute"
                  right="-12px"
                  top="-12px"
                  size="24px"
                  bg="red.500"
                  color="white"
                  fontSize="sm"
                  fontWeight="bold"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  boxShadow="md"
                >
                  {totalItems}
                </Circle>
              )}
            </Box>
          </Flex>
        </Container>
      </Box>
      <Box h="4rem" />
      <Drawer.Root
        placement="top"
        onOpenChange={(e: any) => !e.open && onClose()}
        open={open}
      >
        <Drawer.Backdrop />
        <Drawer.Content>
          <Drawer.Body pt="4rem">
            <Table.ScrollArea>
              <Table.Root variant="line">
                <Table.Body>
                  {role === "ADMIN" && (
                    <>
                      <Table.Row>
                        <Table.Cell>
                          <NextLink href="/loan" passHref legacyBehavior>
                            <Link onClick={onClose}>Varaukset</Link>
                          </NextLink>
                        </Table.Cell>
                      </Table.Row>
                      <Table.Row>
                        <Table.Cell>
                          <NextLink href="/admin/boxes" passHref legacyBehavior>
                            <Link onClick={onClose}>Laatikot</Link>
                          </NextLink>
                        </Table.Cell>
                      </Table.Row>
                      <Table.Row>
                        <Table.Cell>
                          <NextLink href="/admin" passHref legacyBehavior>
                            <Link onClick={onClose}>Admin</Link>
                          </NextLink>
                        </Table.Cell>
                      </Table.Row>
                    </>
                  )}
                  {role === "KIOSK" && (
                    <Table.Row>
                      <Table.Cell>
                        <Button
                          colorScheme="green"
                          size="sm"
                          onClick={() => {
                            router.push("/kiosk/return");
                            onClose();
                          }}
                        >
                          Palauta
                        </Button>
                      </Table.Cell>
                    </Table.Row>
                  )}
                  <Table.Row>
                    <Table.Cell>
                      <NextLink href="/account" passHref legacyBehavior>
                        <Link onClick={onClose}>Oma tili</Link>
                      </NextLink>
                    </Table.Cell>
                  </Table.Row>
                </Table.Body>
              </Table.Root>
            </Table.ScrollArea>
          </Drawer.Body>
        </Drawer.Content>
      </Drawer.Root>
    </>
  );
}
