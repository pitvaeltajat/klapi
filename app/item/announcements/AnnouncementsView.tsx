'use client';

import { Item, Announcement } from '@prisma/client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Breadcrumbs from '@/components/Breadcrumbs';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDateNumeric } from '@/utils/dateFormat';

interface AnnouncementsViewProps {
  announcements: (Announcement & { item: Item })[];
}

export default function AnnouncementsView({ announcements }: AnnouncementsViewProps) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.group === 'ADMIN';
  const [buttonDisabled, setButtonDisabled] = React.useState<string>('');
  const [showExpired, setShowExpired] = React.useState<boolean>(false);
  const router = useRouter();

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
      router.refresh();
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
      <Breadcrumbs items={[{ label: 'Ilmoitukset' }]} />
      <PageHeader title="Ilmoitukset" />

      <Alert variant="info" title="Mitä ilmoitukset ovat?" className="mb-6">
        Ilmoitukset ovat adminien lähettämiä viestejä kamoista — esimerkiksi puutteista,
        rikkoutumisista tai käyttörajoituksista. Tarkista ilmoitukset ennen lainan tekemistä,
        jotta tiedät kamojen ajantasaisen kunnon.
        {isAdmin ? ' Adminina voit poistaa ilmoituksen, kun se ei ole enää ajankohtainen.' : ''}
      </Alert>

      <div className="mb-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox checked={showExpired} onChange={() => setShowExpired(!showExpired)} />
          Näytä vanhentuneet ilmoitukset
        </label>
      </div>

      {visible.length === 0 ? (
        <EmptyState title={showExpired ? 'Ei ilmoituksia' : 'Ei aktiivisia ilmoituksia'} />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {visible.map((announcement) => (
            <Card key={announcement.id} padding="md">
              <div className="flex flex-col items-start gap-3">
                <Badge>Liittyy kamaan: {announcement.item.name}</Badge>
                <p>{announcement.message}</p>
                <p className="text-sm text-muted-foreground">
                  Julkaistu: {formatDateNumeric(announcement.createdAt)}
                </p>
                {showExpired && announcementExpired(announcement) && (
                  <p className="text-sm text-destructive">
                    Vanhentunut{' '}
                    {announcement.expiresAt && formatDateNumeric(announcement.expiresAt)}
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
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
