'use client';

import React, { useState } from 'react';
import NextLink from 'next/link';
import { toast } from 'sonner';
import { Layers } from 'lucide-react';
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

interface SaveAsTemplateButtonProps {
  loanId: string;
  /** Prefills the name field — usually the loan's description. */
  defaultName: string;
  /** Item names to preview, so the admin sees what's about to be saved. */
  preview: { name: string; amount: number }[];
}

/**
 * Turns an existing loan into a reusable template. The server derives the item
 * list from the loan's own reservations (summing duplicates, skipping archived
 * and temporary items), so this only has to collect a name — the set can be
 * fine-tuned afterwards on /admin/templates.
 */
export default function SaveAsTemplateButton({
  loanId,
  defaultName,
  preview,
}: SaveAsTemplateButtonProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/template/createTemplate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, fromLoanId: loanId }),
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
      <Button variant="outline" size="sm" className="gap-2" onClick={() => setOpen(true)}>
        <Layers className="h-4 w-4" /> Tallenna pohjaksi
      </Button>
      <Dialog open={open} onOpenChange={(next) => !busy && setOpen(next)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tallenna laina pohjaksi</DialogTitle>
            <DialogDescription>
              Tämän lainan kamat tallennetaan valmiiksi setiksi, jonka lainaajat saavat yhdellä
              klikkauksella koriin. Määriä voi hienosäätää jälkikäteen{' '}
              <NextLink href="/admin/templates" className="font-medium text-primary underline">
                lainapohjissa
              </NextLink>
              .
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <Field label="Nimi" required htmlFor="save-template-name">
              <Input
                id="save-template-name"
                value={name}
                placeholder="esim. Vartion maastoretki"
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field label="Kuvaus" htmlFor="save-template-description">
              <Textarea
                id="save-template-description"
                value={description}
                placeholder="Vapaaehtoinen selite lainaajalle"
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
            <div>
              <p className="mb-1.5 text-sm font-medium">Pohjaan tulevat kamat</p>
              <ul className="flex flex-col gap-1 rounded-md border p-3 text-sm">
                {preview.map((entry) => (
                  <li key={entry.name} className="flex justify-between gap-2">
                    <span className="truncate">{entry.name}</span>
                    <span className="shrink-0 text-muted-foreground">{entry.amount} kpl</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>
              Peruuta
            </Button>
            <Button onClick={save} isLoading={busy} disabled={!name.trim()}>
              Tallenna pohja
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
