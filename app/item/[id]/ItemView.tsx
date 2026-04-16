'use client';

import { Item, Category, Reservation, LoanStatus } from '@prisma/client';
import { useItemOriginalImage, usePlaceholder } from '@/hooks/useItemImage';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import ReservationTable from '@/components/ReservationTable';
import Breadcrumbs from '@/components/Breadcrumbs';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface ItemWithRelations extends Item {
  categories: Category[];
  reservations: (Reservation & {
    loan: {
      id: string;
      description: string | null;
      status: LoanStatus;
      startTime: Date | string;
      endTime: Date | string;
      userId: string;
    };
    item: { name: string };
  })[];
}

export default function ItemView({ item }: { item: ItemWithRelations }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  const imageSrc = useItemOriginalImage(item.id);
  const placeholder = usePlaceholder();

  const deleteItem = async () => {
    try {
      const response = await fetch('/api/item/deleteItem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.id),
      });

      if (response.ok) {
        toast.success('Legit', { description: 'Kama poistettu' });
        setOpen(false);
        router.push('/');
      } else {
        throw new Error('Failed to delete item');
      }
    } catch (err) {
      toast.error('Error', {
        description: err instanceof Error ? err.message : 'An error occurred',
      });
    }
  };

  return (
    <>
      <Breadcrumbs items={[{ label: item.name }]} />
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-semibold md:text-4xl">{item.name}</h1>

        {item.description && (
          <p className="text-base text-foreground/90 md:text-lg">{item.description}</p>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Määrä:</p>
            <p className="text-lg font-bold">{item.amount} kpl</p>
          </div>
          {item.categories && item.categories.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold text-muted-foreground">Kategoriat:</p>
              <div className="flex flex-wrap gap-2">
                {item.categories.map((category) => (
                  <Badge key={category.id}>{category.name}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <hr />

        <div>
          <img
            src={imgError ? placeholder : imageSrc}
            alt={item.name}
            onError={() => setImgError(true)}
            className="max-h-[300px] max-w-full rounded-md object-contain md:max-h-[500px]"
          />
        </div>

        {session?.user?.group === 'ADMIN' && (
          <div className="flex gap-3">
            <Button onClick={() => router.push(`/admin/edititem/${item.id}`)}>Muokkaa</Button>
            <Button variant="destructive" onClick={() => setOpen(true)}>
              Poista
            </Button>
          </div>
        )}

        <div className="mt-4">
          <h2 className="mb-4 text-xl font-semibold">Varaushistoria</h2>
          <ReservationTable reservations={item.reservations} />
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="mx-4">
          <DialogHeader>
            <DialogTitle>Poistetaanko kama?</DialogTitle>
          </DialogHeader>
          <p>
            <strong>{item.name}</strong> poistetaan. Oletko varma?
          </p>
          <DialogFooter>
            <Button onClick={deleteItem}>Poista</Button>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Peruuta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
