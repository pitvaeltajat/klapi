import prisma from '../../utils/prisma';
import { Item, Announcement } from '@prisma/client';
import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { toast } from 'sonner';
import Breadcrumbs from '../../components/Breadcrumbs';
import { useSession } from 'next-auth/react';
import { GetServerSideProps } from 'next';
import { serialize } from '@/utils/serialize';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface AnnouncementProps {
  announcements: (Announcement & { item: Item })[];
}

export const getServerSideProps: GetServerSideProps = async () => {
  const announcements = await prisma.announcement.findMany({
    orderBy: { createdAt: 'desc' },
    include: { item: true },
  });
  return { props: serialize({ announcements }) };
};

export default function Announcements({ announcements }: AnnouncementProps) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.group === 'ADMIN';
  const [buttonDisabled, setButtonDisabled] = React.useState<string>('');
  const [showExpired, setShowExpired] = React.useState<boolean>(false);
  const router = useRouter();

  const formatDate = (date: Date) =>
    new Date(date).toLocaleString('fi-FI', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const announcementExpired = (announcement: Announcement) => {
    const now = new Date();
    return announcement.expiresAt && new Date(announcement.expiresAt) <= now;
  };

  const expireAnnouncement = async (id: string) => {
    setButtonDisabled(id);
    try {
      const response = await fetch('/api/item/expireAnnouncement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (response.ok) {
        toast.success('Ilmoitus poistettu', { duration: 2500 });
      } else {
        toast.error('Virhe poistettaessa ilmoitusta');
      }
      setButtonDisabled('');
      router.replace(router.asPath);
    } catch (error) {
      toast.error('Virhe poistettaessa ilmoitusta');
      console.error('Error expiring announcement:', error);
      setButtonDisabled('');
    }
  };

  const visible = announcements.filter(
    (announcement) => !announcementExpired(announcement) || showExpired,
  );

  return (
    <>
      <Head>
        <title>Ilmoitukset | Klapi</title>
      </Head>
      <Breadcrumbs items={[{ label: 'Ilmoitukset' }]} />
      <h1 className="mb-6 text-4xl font-semibold">Ilmoitukset</h1>

      <div className="mb-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showExpired}
            onChange={() => setShowExpired(!showExpired)}
          />
          Näytä vanhentuneet ilmoitukset
        </label>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-md bg-muted p-6 text-center">
          <p className="text-muted-foreground">
            {showExpired ? 'Ei ilmoituksia' : 'Ei aktiivisia ilmoituksia'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {visible.map((announcement) => (
            <div key={announcement.id} className="rounded-lg border p-4">
              <div className="flex flex-col items-start gap-3">
                <Badge>Liittyy kamaan: {announcement.item.name}</Badge>
                <p>{announcement.message}</p>
                <p className="text-sm text-muted-foreground">
                  Julkaistu: {formatDate(new Date(announcement.createdAt))}
                </p>
                {showExpired && announcementExpired(announcement) && (
                  <p className="text-sm text-destructive">
                    Vanhentunut{' '}
                    {announcement.expiresAt && formatDate(new Date(announcement.expiresAt))}
                  </p>
                )}
                {isAdmin && !announcementExpired(announcement) && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={buttonDisabled === announcement.id}
                    onClick={() => expireAnnouncement(announcement.id)}
                  >
                    Poista ilmoitus
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
