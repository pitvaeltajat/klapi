import { Box, Tag } from "@chakra-ui/react";
import { LoanStatus } from "@prisma/client";

const getColor = (status: LoanStatus): string => {
  switch (status) {
    case LoanStatus.PENDING:
      return "yellow";
    case LoanStatus.ACCEPTED:
      return "green";
    case LoanStatus.REJECTED:
      return "red";
    case LoanStatus.INUSE:
      return "blue";
    case LoanStatus.RETURNED:
      return "gray";
    default:
      return "gray";
  }
};

export default function StatusLabel({ status }: { status: LoanStatus }) {
  return (
    <Box>
      <Tag colorScheme={getColor(status)} width="fit-content">
        {status === LoanStatus.ACCEPTED
          ? "Hyväksytty"
          : status === LoanStatus.REJECTED
          ? "Hylätty"
          : status === LoanStatus.PENDING
          ? "Odottaa"
          : status === LoanStatus.INUSE
          ? "Käytössä"
          : status === LoanStatus.RETURNED
          ? "Palautettu"
          : "Tuntematon"}
      </Tag>
    </Box>
  );
}
