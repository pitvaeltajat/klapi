import React from 'react';
import {
  Box,
  Button,
  Heading,
  Stack,
  Text,
  Divider,
  RadioGroup,
  Radio,
  Wrap,
  WrapItem,
  Textarea,
  CheckboxGroup,
  Checkbox,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Spacer,
} from '@chakra-ui/react';
import { Reservation } from '@prisma/client';

interface ReportCardProps {
  reports: any[];
  loan: any;
  expandedReportId: string | null;
  setExpandedReportId: (id: string | null) => void;
  announcement: { itemId: string; content: string };
  setAnnouncement: (a: { itemId: string; content: string }) => void;
  affectedItems: { [key: string]: number };
  setAffectedItems: (a: { [key: string]: number }) => void;
  onSetProcessing: (reportId: string, affectedItems?: { [key: string]: number }) => void;
  onSetResolved: (reportId: string, affectedItems?: { [key: string]: number }) => void;
  onSendAnnouncement: (itemId: string, content: string) => void;
}

interface ReservationWithItem extends Reservation {
  item: {
    id: string;
    name: string;
    amount: number;
  };
}

const ReportCard: React.FC<ReportCardProps> = ({
  reports,
  loan,
  expandedReportId,
  setExpandedReportId,
  announcement,
  setAnnouncement,
  affectedItems,
  setAffectedItems,
  onSetProcessing,
  onSetResolved,
  onSendAnnouncement,
}) => {
  return (
    <Box bg="white" p={6} borderRadius="lg" borderWidth="1px">
      <Heading as="h2" size="lg" mb={4}>
        Raportit
      </Heading>
      <Stack spacing={4}>
        {reports.map((report) => {
          const expanded = expandedReportId === report.id;
          return (
            <Box
              key={report.id}
              p={expanded ? 6 : 4}
              borderWidth="1px"
              borderRadius="md"
              bg={expanded ? 'gray.50' : 'gray.50'}
              boxShadow={expanded ? 'lg' : undefined}
            >
              <Text whiteSpace="pre-wrap" fontSize={expanded ? 'md' : 'sm'}>
                {expanded
                  ? report.content
                  : report.content.length < 100
                    ? report.content
                    : report.content.substring(0, 100) + '...'}
              </Text>
              <Text fontSize="sm" color="gray.600" mt={2}>
                Luotu:{' '}
                {new Date(report.createdAt).toLocaleString('fi-FI', {
                  dateStyle: 'full',
                  timeStyle: 'short',
                })}
              </Text>
              {!expanded ? (
                <Button mt={2} size="sm" onClick={() => setExpandedReportId(report.id)}>
                  Käsittele raportti
                </Button>
              ) : (
                <Box>
                  <Box
                    mt={4}
                    mb={2}
                    fontWeight="semibold"
                    fontSize="lg"
                    borderWidth="1px"
                    p={4}
                    borderRadius="md"
                    bg="white"
                  >
                    <Text mb={2}>Lisää ilmoitus kamalle:</Text>
                    <RadioGroup defaultValue="none">
                      <Wrap direction="row">
                        {loan.reservations.map((reservation: any) => (
                          <WrapItem key={reservation.item.id}>
                            <Box>
                              <Radio
                                value={reservation.item.id}
                                onChange={() =>
                                  setAnnouncement({
                                    itemId: reservation.item.id,
                                    content: announcement.content,
                                  })
                                }
                              >
                                {reservation.item.name}
                              </Radio>
                            </Box>
                          </WrapItem>
                        ))}
                      </Wrap>
                    </RadioGroup>
                    <Textarea
                      mt={2}
                      placeholder="Kirjoita ilmoitus"
                      rows={3}
                      value={announcement.content}
                      onChange={(e) =>
                        setAnnouncement({
                          itemId: announcement.itemId,
                          content: e.target.value,
                        })
                      }
                    />
                    <Button
                      mt={2}
                      colorScheme="blue"
                      size="sm"
                      onClick={() => {
                        if (announcement.itemId && announcement.content) {
                          onSendAnnouncement(announcement.itemId, announcement.content);
                          setAnnouncement({ itemId: '', content: '' });
                        }
                      }}
                      isDisabled={!announcement.itemId || !announcement.content}
                    >
                      Lähetä ilmoitus
                    </Button>
                  </Box>
                  <Box
                    mt={4}
                    mb={2}
                    fontWeight="semibold"
                    fontSize="lg"
                    borderWidth="1px"
                    p={4}
                    borderRadius="md"
                    bg="white"
                  >
                    <Text mb={2}>Poista kama valikoimista käsittelyn ajaksi:</Text>
                    <CheckboxGroup>
                      <Stack spacing={2} direction="column">
                        {loan.reservations.map((reservation: ReservationWithItem) => (
                          <React.Fragment key={reservation.item.id}>
                            <Divider />
                            <Wrap>
                              <WrapItem>
                                <Checkbox
                                  value={reservation.item.id}
                                  isChecked={
                                    reservation.item.id in affectedItems &&
                                    affectedItems[reservation.item.id] > 0
                                  }
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    if (e.target.checked) {
                                      setAffectedItems({
                                        ...affectedItems,
                                        [reservation.item.id]: reservation.amount,
                                      });
                                    } else {
                                      setAffectedItems({
                                        ...affectedItems,
                                        [reservation.item.id]: 0,
                                      });
                                    }
                                  }}
                                >
                                  {reservation.item.name}
                                  {affectedItems[reservation.item.id] > 0 &&
                                    ` - ${affectedItems[reservation.item.id]} kpl`}
                                </Checkbox>
                              </WrapItem>
                              <Spacer />
                              <WrapItem>
                                <NumberInput
                                  min={1}
                                  max={reservation.item.amount}
                                  value={affectedItems[reservation.item.id] || 0}
                                  size="sm"
                                  width="60px"
                                  borderRadius={'md'}
                                  isDisabled={
                                    !(reservation.item.id in affectedItems) ||
                                    affectedItems[reservation.item.id] === 0
                                  }
                                  onChange={(_valueString: string, valueNumber: number) => {
                                    setAffectedItems({
                                      ...affectedItems,
                                      [reservation.item.id]: valueNumber,
                                    });
                                  }}
                                >
                                  <NumberInputField />
                                  <NumberInputStepper>
                                    <NumberIncrementStepper />
                                    <NumberDecrementStepper />
                                  </NumberInputStepper>
                                </NumberInput>
                                <Text ml={2}>kpl</Text>
                              </WrapItem>
                            </Wrap>
                          </React.Fragment>
                        ))}
                      </Stack>
                    </CheckboxGroup>
                  </Box>
                  <Wrap direction="row" spacing={2} mt={4}>
                    <WrapItem>
                      <Button
                        colorScheme="orange"
                        size="sm"
                        onClick={() => onSetProcessing(report.id, affectedItems)}
                      >
                        Ota käsittelyyn
                      </Button>
                    </WrapItem>
                    <WrapItem>
                      <Button
                        colorScheme="green"
                        size="sm"
                        isDisabled={Object.values(affectedItems).filter((v) => v > 0).length !== 0}
                        onClick={() => onSetResolved(report.id, affectedItems)}
                      >
                        Aseta käsitellyksi
                      </Button>
                    </WrapItem>
                    <WrapItem>
                      <Button
                        colorScheme="gray"
                        size="sm"
                        onClick={() => setExpandedReportId(null)}
                      >
                        Käsittele myöhemmin
                      </Button>
                    </WrapItem>
                  </Wrap>
                </Box>
              )}
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
};

export default ReportCard;
