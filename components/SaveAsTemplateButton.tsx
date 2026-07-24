'use client';

import React, { useState } from 'react';
import NextLink from 'next/link';
import { toast } from 'sonner';
import { Layers, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field } from '@/components/ui/field';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import ItemAmountCard from './ItemAmountCard';
import type { TemplateDraftItem } from '@/utils/templateDraft';

interface SaveAsTemplateButtonProps {
  /** Prefills the name field — usually the loan's description. */
  defaultName: string;
  /** The loan's items, already collapsed per item. Editable in the dialog. */
  items: TemplateDraftItem[];
}

/**
 * Turns an existing loan into a reusable set. The loan's items are only a
 * starting point: the admin dials amounts up to what's in storage and drops
 * rows before saving, so a one-off extra in the loan doesn't end up in every
 * future set. The edited list is what gets posted — not the loan id — so what
 * the dialog shows is exactly what gets created.
 */
export default function SaveAsTemplateButton({ defaultName, items }: SaveAsTemplateButtonProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState('');
  const [rows, setRows] = useState<TemplateDraftItem[]>(items);
  const [busy, setBusy] = useState(false);

  // Reopening starts from the loan again rather than from a half-edited draft
  // the admin already walked away from.
  const openDialog = () => {
    setName(defaultName);
    setDescription('');
    setRows(items);
    setOpen(true);
  };

  const setAmount = (itemId: string, amount: number) =>
    setRows((current) =>
      current.map((row) => (row.itemId === itemId ? { ...row, amount } : row)),
    );

  const removeRow = (itemId: string) =>
    setRows((current) => current.filter((row) => row.itemId !== itemId));

  const save = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/template/createTemplate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          items: rows.map((row) => ({ itemId: row.itemId, amount: row.amount })),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Pohjan tallennus epäonnistui');
      }
      toast.success('Pohja tallennettu', {
        description: `"${name.trim()}" näkyy nyt lainaajille kamalistan yläpuolella.`,
      });
      setOpen(false);
    } catch (err) {
      toast.error('Virhe', {
        description: err instanceof Error ? err.message : 'Tuntematon virhe',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" className="gap-2" onClick={openDialog}>
        <Layers className="h-4 w-4" /> Tallenna pohjaksi
      </Button>
      <Dialog open={open} onOpenChange={(next) => !busy && setOpen(next)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Tallenna laina pohjaksi</DialogTitle>
            <DialogDescription>
              Tämän lainan kamoista tulee valmis setti, jonka lainaajat saavat yhdellä
              klikkauksella koriin. Säädä määriä tai pudota kamoja pois jo tässä — pohjaa voi
              muokata myöhemminkin{' '}
              <NextLink href="/admin/templates" className="font-medium text-primary underline">
                lainapohjissa
              </NextLink>
              .
            </DialogDescription>
          </DialogHeader>

          {/* The name and description sit side by side across the full width,
              and the item list below gets two columns of its own — a long set
              would otherwise run far past the two short text fields. */}
          <div className="grid gap-4 md:grid-cols-2 md:items-start">
            <Field label="Nimi" required htmlFor="save-template-name">
              <Input
                id="save-template-name"
                value={name}
                placeholder="esim. Vartion maastoretki"
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field
              label="Kuvaus"
              htmlFor="save-template-description"
              helper="Näkyy lainaajalle setin nimen alla."
            >
              <Textarea
                id="save-template-description"
                value={description}
                placeholder="Vapaaehtoinen selite lainaajalle"
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">
              Pohjaan tulevat kamat{' '}
              <span className="font-normal text-muted-foreground">({rows.length})</span>
            </p>
            {rows.length === 0 ? (
              <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                Ei kamoja — pohjassa pitää olla vähintään yksi.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {rows.map((row) => (
                  <ItemAmountCard
                    key={row.itemId}
                    itemId={row.itemId}
                    name={row.name}
                    amount={row.amount}
                    subtitle={
                      <span className="flex items-center gap-1.5 font-normal text-muted-foreground">
                        <Package className="size-3.5 shrink-0" aria-hidden />
                        {row.amount} / {row.stock} varastossa
                      </span>
                    }
                    decrementDisabled={row.amount <= 1}
                    incrementDisabled={row.amount >= row.stock}
                    onDecrement={() => setAmount(row.itemId, Math.max(1, row.amount - 1))}
                    onIncrement={() => setAmount(row.itemId, Math.min(row.stock, row.amount + 1))}
                    onRemove={() => removeRow(row.itemId)}
                    removeLabel={`Jätä ${row.name} pois pohjasta`}
                  />
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>
              Peruuta
            </Button>
            <Button onClick={save} isLoading={busy} disabled={!name.trim() || rows.length === 0}>
              Tallenna pohja
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
