// get item by id and return it
import prisma from '../../utils/prisma';
import { Item, Announcement } from '@prisma/client';
import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Heading,
  Button,
  useToast,
  VStack,
  Text,
  Box,
  Badge,
  SimpleGrid,
  Checkbox,
} from '@chakra-ui/react';
import Breadcrumbs from '../../components/Breadcrumbs';
import { useSession } from 'next-auth/react';
import { GetServerSideProps } from 'next';

interface AnnouncementProps {
  announcements: (Announcement & {
    item: Item;
  })[];
}

export const getServerSideProps: GetServerSideProps<AnnouncementProps> = async () => {
  const announcements = await prisma.announcement.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      item: true,
    },
  });

  return {
    props: {
      announcements: JSON.parse(JSON.stringify(announcements)),
    },
  };
};

export default function Announcements({ announcements }: AnnouncementProps) {
  const { data: session } = useSession();

  const isAdmin = session?.user?.group === 'ADMIN';

  const [buttonDisabled, setButtonDisabled] = React.useState<string>('');

  const [showExpired, setShowExpired] = React.useState<boolean>(false);

  const toast = useToast();

  const router = useRouter();

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('fi-FI', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const announcementExpired = (announcement: Announcement) => {
    const now = new Date();
    return announcement.expiresAt && new Date(announcement.expiresAt) <= now;
  };

  const expireAnnouncement = async (id: string) => {
    setButtonDisabled(id);
    try {
      const response = await fetch('/api/item/expireAnnouncement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });

      if (response.ok) {
        toast({
          title: 'Ilmoitus poistettu',
          status: 'success',
          duration: 2500,
        });
      } else {
        toast({
          title: 'Virhe poistettaessa ilmoitusta',
          status: 'error',
          duration: 3000,
        });
      }

      setButtonDisabled('');
      router.replace(router.asPath);
    } catch (error) {
      toast({
        title: 'Virhe poistettaessa ilmoitusta',
        status: 'error',
        duration: 3000,
      });
      console.error('Error expiring announcement:', error);
      setButtonDisabled('');
    }
  };

  return (
    <>
      <Head>
        <title>Ilmoitukset | Klapi</title>
      </Head>
      <Breadcrumbs items={[{ label: 'Ilmoitukset' }]} />
      <Heading as="h1" size="xl" mb={6}>
        Ilmoitukset
      </Heading>

      <Box mb={4}>
        <Checkbox isChecked={showExpired} onChange={() => setShowExpired(!showExpired)}>
          Näytä vanhentuneet ilmoitukset
        </Checkbox>
      </Box>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
        {announcements
          .filter((announcement) => !announcementExpired(announcement) || showExpired)
          .map((announcement) => (
            <Box key={announcement.id} borderWidth="1px" borderRadius="lg" p={4}>
              <VStack align="start" spacing={3}>
                <Badge colorScheme="blue">Liittyy kamaan: {announcement.item.name}</Badge>
                <Text>{announcement.message}</Text>

                <Text fontSize="sm" color="gray.500">
                  Julkaistu: {formatDate(new Date(announcement.createdAt))}
                </Text>
                {showExpired && announcementExpired(announcement) && (
                  <Text fontSize="sm" color="red.500">
                    Vanhentunut{' '}
                    {announcement.expiresAt && formatDate(new Date(announcement.expiresAt))}
                  </Text>
                )}
                {isAdmin && !announcementExpired(announcement) && (
                  <Button
                    size="sm"
                    colorScheme="red"
                    variant="outline"
                    isDisabled={buttonDisabled === announcement.id}
                    onClick={() => expireAnnouncement(announcement.id)}
                  >
                    Poista ilmoitus
                  </Button>
                )}
              </VStack>
            </Box>
          ))}
      </SimpleGrid>
    </>
  );
}
