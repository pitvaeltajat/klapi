import { Container, Spinner, Flex } from '@chakra-ui/react';

interface LoadingSpinnerProps {
  fullWidth?: boolean;
  minHeight?: string;
}

export default function LoadingSpinner({
  fullWidth = false,
  minHeight = '50vh',
}: LoadingSpinnerProps) {
  const content = (
    <Flex justify="center" align="center" minH={minHeight}>
      <Spinner size="xl" color="blue.500" thickness="4px" />
    </Flex>
  );

  if (fullWidth) {
    return content;
  }

  return (
    <Container maxW="container.xl" px={4}>
      {content}
    </Container>
  );
}
