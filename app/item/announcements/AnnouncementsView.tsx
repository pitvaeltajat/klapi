'use client';

import { Item, Announcement } from '@prisma/client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Breadcrumbs from '@/components/Breadcrumbs';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
      <h1 className="mb-4 text-3xl font-semibold">Ilmoitukset</h1>

      <div className="mb-6 rounded-md border border-primary/20 bg-primary/5 p-4 text-sm">
        <p className="mb-1 font-semibold">Mitä ilmoitukset ovat?</p>
        <p className="text-muted-foreground">
          Ilmoitukset ovat adminien lähettämiä viestejä kamoista — esimerkiksi puutteista,
          rikkoutumisista tai käyttörajoituksista. Tarkista ilmoitukset ennen lainan tekemistä,
          jotta tiedät kamojen ajantasaisen kunnon.
          {isAdmin
            ? ' Adminina voit poistaa ilmoituksen, kun se ei ole enää ajankohtainen.'
            : ''}
        </p>
      </div>

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
            </div>
          ))}
        </div>
      )}
    </>
  );
}
