'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { DateTime } from '@/components/DateTime';

export interface ItemAnnouncement {
  id: string;
  message: string;
  createdAt: string | Date;
  expiresAt: string | Date | null;
}

interface ItemAnnouncementsProps {
  itemId: string;
  announcements: ItemAnnouncement[];
  isAdmin: boolean;
}

export default function ItemAnnouncements({
  itemId,
  announcements,
  isAdmin,
}: ItemAnnouncementsProps) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState('');

  const isExpired = (a: ItemAnnouncement) =>
    a.expiresAt != null && new Date(a.expiresAt) <= new Date();
  const active = announcements.filter((a) => !isExpired(a));

  const addAnnouncement = async () => {
    const trimmed = message.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/item/createAnnouncement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ announcement: { itemId, message: trimmed } }),
      });
      if (!res.ok) throw new Error('failed');
      toast.success('Ilmoitus lisätty');
      setMessage('');
      router.refresh();
    } catch {
      toast.error('Virhe lisättäessä ilmoitusta');
    } finally {
      setSubmitting(false);
    }
  };

  const removeAnnouncement = async (id: string) => {
    setRemovingId(id);
    try {
      const res = await fetch('/api/item/expireAnnouncement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('failed');
      toast.success('Ilmoitus poistettu');
      router.refresh();
    } catch {
      toast.error('Virhe poistettaessa ilmoitusta');
    } finally {
      setRemovingId('');
    }
  };

  // Non-admins with nothing to see don't need an empty section.
  if (!isAdmin && active.length === 0) return null;

  return (
    <Card as="section">
      <CardHeader className="justify-start gap-2">
        <TriangleAlert className="h-4 w-4 text-destructive" />
        <CardTitle>Ilmoitukset{active.length > 0 ? ` (${active.length})` : ''}</CardTitle>
      </CardHeader>

      {active.length === 0 ? (
        <EmptyState variant="inline" title="Ei aktiivisia ilmoituksia tälle kamalle." />
      ) : (
        <ul className="flex flex-col gap-3">
          {active.map((a) => (
            <Card
              as="li"
              key={a.id}
              variant="inset"
              padding="sm"
              className="flex items-start justify-between gap-3 border-destructive/40 bg-destructive/10"
            >
              <div className="min-w-0">
                <p className="whitespace-pre-wrap text-sm">{a.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Julkaistu <DateTime value={a.createdAt} format="numeric" />
                </p>
              </div>
              {isAdmin && (
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  disabled={removingId === a.id}
                  onClick={() => removeAnnouncement(a.id)}
                >
                  Poista
                </Button>
              )}
            </Card>
          ))}
        </ul>
      )}

      {isAdmin && (
        <div className="mt-4 border-t pt-4">
          <p className="mb-2 text-sm font-semibold">Lisää ilmoitus</p>
          <Textarea
            rows={3}
            placeholder="Kirjoita ilmoitus tästä kamasta — esim. puute, rikkoutuminen tai käyttörajoitus"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <Button
            size="sm"
            className="mt-2"
            disabled={!message.trim() || submitting}
            onClick={addAnnouncement}
          >
            Lisää ilmoitus
          </Button>
        </div>
      )}
    </Card>
  );
}
