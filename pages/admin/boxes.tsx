import React from "react";
import prisma from "../../utils/prisma";
import {
  Container,
  Heading,
  SimpleGrid,
  Box,
  Stack,
  Text,
  Link,
  Badge,
  VStack,
  HStack,
  Separator,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { useSession } from "next-auth/react";
import NotAuthenticated from "../../components/NotAuthenticated";
import {
  cardStyles,
  headingSizes,
  spacing,
  containerMaxWidth,
} from "@/styles/designTokens";
import { Box as BoxType, Item, Reservation, Loan } from "@prisma/client";
import { GetServerSideProps } from "next";

interface LoanWithReservations extends Loan {
  reservations: (Reservation & {
    item: Item;
  })[];
}

interface BoxWithLoans extends BoxType {
  loans: LoanWithReservations[];
}

interface BoxesPageProps {
  boxes: BoxWithLoans[];
}

export const getServerSideProps: GetServerSideProps<
  BoxesPageProps
> = async () => {
  const boxes = await prisma.box.findMany({
    include: {
      loans: {
        include: {
          reservations: {
            include: {
              item: true,
            },
          },
        },
        where: {
          status: {
            in: ["IN_BOX"],
          },
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return {
    props: {
      boxes: JSON.parse(JSON.stringify(boxes)),
    },
  };
};

export default function BoxesPage({ boxes }: BoxesPageProps) {
  const { data: session } = useSession();

  if (session?.user?.group !== "ADMIN") {
    return <NotAuthenticated />;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACCEPTED":
        return "green";
      case "INUSE":
        return "blue";
      case "IN_BOX":
        return "purple";
      default:
        return "gray";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "ACCEPTED":
        return "Hyväksytty";
      case "INUSE":
        return "Käytössä";
      case "IN_BOX":
        return "Laatikossa";
      default:
        return status;
    }
  };

  return (
    <Container maxW={containerMaxWidth} {...spacing.containerPadding}>
      <Heading
        as="h1"
        size={headingSizes.pageTitle}
        mb={spacing.sectionSpacing}
      >
        Laatikot
      </Heading>

      {boxes.length === 0 ? (
        <Box {...cardStyles.base} textAlign="center">
          <Text fontSize="lg" color="gray.600">
            Ei laatikkoja
          </Text>
        </Box>
      ) : (
        <SimpleGrid
          columns={{ base: 1, md: 2, lg: 3 }}
          gap={spacing.sectionSpacing}
        >
          {boxes.map((box) => {
            return (
              <Box
                key={box.id}
                {...cardStyles.base}
                _hover={{
                  ...cardStyles.hover,
                  transform: "translateY(-2px)",
                  transition: "all 0.2s",
                }}
              >
                <VStack align="stretch" gap={spacing.elementSpacing}>
                  <Box>
                    <Heading
                      as="h2"
                      size={headingSizes.subsection}
                      mb={spacing.tightSpacing}
                    >
                      {box.name}
                    </Heading>
                    {box.description && (
                      <Text fontSize="sm" color="gray.600">
                        {box.description}
                      </Text>
                    )}
                  </Box>

                  <Separator />

                  <Box>
                    <HStack justify="space-between" mb={spacing.tightSpacing}>
                      <Text
                        fontWeight="semibold"
                        fontSize="sm"
                        color="gray.700"
                      >
                        Varaukset
                      </Text>
                      <Badge colorScheme="blue">{box.loans.length}</Badge>
                    </HStack>

                    {box.loans.length === 0 ? (
                      <Text fontSize="sm" color="gray.500" fontStyle="italic">
                        Ei varauksia
                      </Text>
                    ) : (
                      <Stack gap={spacing.tightSpacing}>
                        {box.loans.map((loan) => (
                          <NextLink
                            key={loan.id}
                            href={`/loan/${loan.id}`}
                            passHref
                            legacyBehavior
                          >
                            <Link _hover={{ textDecoration: "none" }}>
                              <Box
                                {...cardStyles.compact}
                                _hover={{
                                  bg: "gray.100",
                                  borderColor: "blue.300",
                                }}
                                transition="all 0.2s"
                              >
                                <VStack
                                  align="stretch"
                                  gap={spacing.tightSpacing}
                                >
                                  <HStack justify="space-between">
                                    <Text fontWeight="medium" fontSize="sm">
                                      {loan.description || "Ei kuvausta"}
                                    </Text>
                                    <Badge
                                      colorScheme={getStatusColor(loan.status)}
                                      fontSize="xs"
                                    >
                                      {getStatusText(loan.status)}
                                    </Badge>
                                  </HStack>
                                  <Text fontSize="xs" color="gray.600">
                                    {loan.reservations
                                      .map(
                                        (r) => `${r.item.name} (${r.amount})`
                                      )
                                      .join(", ")}
                                  </Text>
                                  <Text fontSize="xs" color="gray.500">
                                    {new Date(
                                      loan.startTime
                                    ).toLocaleDateString("fi-FI")}{" "}
                                    -{" "}
                                    {new Date(loan.endTime).toLocaleDateString(
                                      "fi-FI"
                                    )}
                                  </Text>
                                </VStack>
                              </Box>
                            </Link>
                          </NextLink>
                        ))}
                      </Stack>
                    )}
                  </Box>
                </VStack>
              </Box>
            );
          })}
        </SimpleGrid>
      )}
    </Container>
  );
}
