'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DateTime } from '@/components/DateTime';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ReservationLike {
  item: { id: string; name: string; amount: number };
  amount: number;
}

interface ReportLike {
  id: string;
  content: string;
  createdAt: string | Date;
  status: string;
}

interface HandleReportDialogProps {
  report: ReportLike;
  reservations: ReservationLike[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function HandleReportDialog({
  report,
  reservations,
  open,
  onOpenChange,
}: HandleReportDialogProps) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [affectedItems, setAffectedItems] = React.useState<{ [key: string]: number }>({});
  const [announcement, setAnnouncement] = React.useState<{ itemId: string; content: string }>({
    itemId: '',
    content: '',
  });

  const inProgress = report.status === 'IN_PROGRESS';
  const isResolved = report.status === 'RESOLVED';

  const guard = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  const editReport = (status: 'IN_PROGRESS' | 'RESOLVED') =>
    guard(async () => {
      const res = await fetch('/api/loan/editReport', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: report.id, status, affectedItems }),
      });
      if (!res.ok) {
        toast.error('Raportin päivitys epäonnistui');
        return;
      }
      toast.success(
        status === 'IN_PROGRESS'
          ? 'Raportti otettu käsittelyyn'
          : 'Raportti merkitty käsitellyksi',
      );
      onOpenChange(false);
      router.refresh();
    });

  const sendAnnouncement = () =>
    guard(async () => {
      if (!announcement.itemId || !announcement.content) return;
      const res = await fetch('/api/item/createAnnouncement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          announcement: { itemId: announcement.itemId, message: announcement.content },
        }),
      });
      if (!res.ok) {
        toast.error('Ilmoituksen lähetys epäonnistui');
        return;
      }
      toast.success('Ilmoitus lähetetty');
      setAnnouncement({ itemId: '', content: '' });
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Käsittele raportti</DialogTitle>
        </DialogHeader>

        <div className="rounded-md border bg-muted p-4">
          <p className="whitespace-pre-wrap text-sm">{report.content}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Luotu: <DateTime value={report.createdAt} format="long" />
          </p>
          {isResolved && (
            <Badge variant="success" className="mt-2">
              Ratkaistu
            </Badge>
          )}
          {inProgress && (
            <Badge variant="warning" className="mt-2">
              Käsittelyssä
            </Badge>
          )}
        </div>

        {!isResolved && (
          <div className="rounded-md border bg-card p-4">
            <p className="mb-2 font-semibold">Lisää ilmoitus kamalle:</p>
            <div role="radiogroup" className="flex flex-wrap gap-3">
              {reservations.map((reservation) => (
                <label key={reservation.item.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="announcement-item"
                    value={reservation.item.id}
                    disabled={inProgress}
                    checked={announcement.itemId === reservation.item.id}
                    onChange={() =>
                      setAnnouncement({
                        itemId: reservation.item.id,
                        content: announcement.content,
                      })
                    }
                  />
                  {reservation.item.name}
                </label>
              ))}
            </div>
            <Textarea
              className="mt-2"
              placeholder="Kirjoita ilmoitus"
              rows={3}
              value={announcement.content}
              disabled={inProgress}
              onChange={(e) =>
                setAnnouncement({
                  itemId: announcement.itemId,
                  content: e.target.value,
                })
              }
            />
            <Button
              size="sm"
              className="mt-2"
              onClick={sendAnnouncement}
              disabled={
                !announcement.itemId || !announcement.content || inProgress || busy
              }
            >
              Lähetä ilmoitus
            </Button>
          </div>
        )}

        {!isResolved && !inProgress && (
          <div className="rounded-md border bg-card p-4">
            <p className="mb-2 font-semibold">Poista kama valikoimista käsittelyn ajaksi:</p>
            <div className="flex flex-col gap-2">
              {reservations.map((reservation) => (
                <React.Fragment key={reservation.item.id}>
                  <hr />
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        value={reservation.item.id}
                        checked={
                          reservation.item.id in affectedItems &&
                          affectedItems[reservation.item.id] > 0
                        }
                        onChange={(e) => {
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
                      />
                      {reservation.item.name}
                      {affectedItems[reservation.item.id] > 0 &&
                        ` - ${affectedItems[reservation.item.id]} kpl`}
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={reservation.item.amount}
                        value={affectedItems[reservation.item.id] || 0}
                        className="h-9 w-20"
                        disabled={
                          !(reservation.item.id in affectedItems) ||
                          affectedItems[reservation.item.id] === 0
                        }
                        onChange={(e) => {
                          setAffectedItems({
                            ...affectedItems,
                            [reservation.item.id]: Number(e.target.value) || 0,
                          });
                        }}
                      />
                      <span className="text-sm">kpl</span>
                    </div>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {!isResolved && (
            <>
              <Button
                variant="warning"
                size="sm"
                disabled={inProgress || busy}
                onClick={() => editReport('IN_PROGRESS')}
              >
                Ota käsittelyyn
              </Button>
              <Button
                variant="success"
                size="sm"
                disabled={
                  busy ||
                  Object.values(affectedItems).filter((v) => v > 0).length !== 0
                }
                onClick={() => editReport('RESOLVED')}
              >
                Aseta käsitellyksi
              </Button>
            </>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Sulje
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
