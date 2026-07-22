'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import NotAuthenticated from '@/components/NotAuthenticated';
import Breadcrumbs from '@/components/Breadcrumbs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field } from '@/components/ui/field';
import { NumberInput } from '@/components/ui/number-input';
import { Select } from '@/components/ui/creatable-select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import type { TemplateView } from '@/types';

interface ItemOption {
  id: string;
  name: string;
  amount: number;
}

interface TemplatesViewProps {
  templates: TemplateView[];
  /** Per template, how many of its items have been archived since it was made. */
  archivedCounts: Record<string, number>;
  items: ItemOption[];
}

interface Draft {
  /** Absent for a template being created. */
  id?: string;
  name: string;
  description: string;
  rows: { itemId: string; amount: number }[];
}

const fiCollator = new Intl.Collator('fi');

export default function TemplatesView({
  templates,
  archivedCounts,
  items,
}: TemplatesViewProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TemplateView | null>(null);
  const [busy, setBusy] = useState(false);

  if (session?.user?.group !== 'ADMIN') return <NotAuthenticated />;

  const itemsById = new Map(items.map((item) => [item.id, item]));

  const startCreate = () => setDraft({ name: '', description: '', rows: [] });
  const startEdit = (template: TemplateView) =>
    setDraft({
      id: template.id,
      name: template.name,
      description: template.description ?? '',
      rows: template.items.map((entry) => ({ itemId: entry.itemId, amount: entry.amount })),
    });

  const post = async (url: string, body: unknown) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || 'Toiminto epäonnistui');
    }
    return res.json();
  };

  const save = async () => {
    if (!draft || busy) return;
    setBusy(true);
    try {
      await post(draft.id ? '/api/template/updateTemplate' : '/api/template/createTemplate', {
        id: draft.id,
        name: draft.name,
        description: draft.description,
        items: draft.rows,
      });
      toast.success(draft.id ? 'Pohja tallennettu' : 'Pohja luotu');
      setDraft(null);
      router.refresh();
    } catch (err) {
      toast.error('Virhe', {
        description: err instanceof Error ? err.message : 'Tuntematon virhe',
      });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!pendingDelete || busy) return;
    setBusy(true);
    try {
      await post('/api/template/deleteTemplate', { id: pendingDelete.id });
      toast.success('Pohja poistettu');
      setPendingDelete(null);
      router.refresh();
    } catch (err) {
      toast.error('Virhe', {
        description: err instanceof Error ? err.message : 'Tuntematon virhe',
      });
    } finally {
      setBusy(false);
    }
  };

  const addRow = (itemId: string) =>
    setDraft((current) =>
      current && !current.rows.some((row) => row.itemId === itemId)
        ? { ...current, rows: [...current.rows, { itemId, amount: 1 }] }
        : current,
    );

  const setRowAmount = (itemId: string, amount: number) =>
    setDraft((current) =>
      current
        ? {
            ...current,
            rows: current.rows.map((row) => (row.itemId === itemId ? { ...row, amount } : row)),
          }
        : current,
    );

  const removeRow = (itemId: string) =>
    setDraft((current) =>
      current ? { ...current, rows: current.rows.filter((row) => row.itemId !== itemId) } : current,
    );

  const availableOptions = items
    .filter((item) => !draft?.rows.some((row) => row.itemId === item.id))
    .map((item) => ({ value: item.id, label: `${item.name} (${item.amount} kpl)` }));

  const canSave = Boolean(draft?.name.trim()) && (draft?.rows.length ?? 0) > 0;

  return (
    <>
      <Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: 'Lainapohjat' }]} />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Lainapohjat</h1>
          <p className="mt-1 text-muted-foreground">
            Valmiit kamasetit, jotka lainaaja saa yhdellä klikkauksella koriin. Lainaaja voi aina
            säätää määriä — pohja on ehdotus, ei pakkopaketti.
          </p>
        </div>
        <Button onClick={startCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Uusi pohja
        </Button>
      </div>

      {templates.length === 0 ? (
        <div className="rounded-lg border bg-muted p-8 text-center">
          <p className="text-lg text-muted-foreground">Ei pohjia</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Luo pohja tästä tai tallenna sellainen valmiista lainasta sen omalta sivulta.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <div key={template.id} className="flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-xs">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-semibold">{template.name}</h2>
                <Badge variant="secondary">{template.items.length} kamaa</Badge>
              </div>
              {template.description && (
                <p className="text-sm text-muted-foreground">{template.description}</p>
              )}
              <ul className="flex flex-col gap-1 text-sm">
                {[...template.items]
                  .sort((a, b) => fiCollator.compare(a.name, b.name))
                  .map((entry) => (
                    <li key={entry.itemId} className="flex justify-between gap-2">
                      <span className="truncate">{entry.name}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {entry.amount} / {entry.stock} kpl
                      </span>
                    </li>
                  ))}
                {template.items.length === 0 && (
                  <li className="italic text-muted-foreground">Ei näytettäviä kamoja</li>
                )}
              </ul>
              {(archivedCounts[template.id] ?? 0) > 0 && (
                <p className="text-xs text-muted-foreground">
                  + {archivedCounts[template.id]} arkistoitua kamaa, joita ei näytetä lainaajalle.
                  Ne palaavat pohjaan, jos kama palautetaan arkistosta.
                </p>
              )}
              <div className="mt-auto flex gap-2 pt-2">
                <Button variant="warning" size="sm" className="flex-1" onClick={() => startEdit(template)}>
                  Muokkaa
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                  onClick={() => setPendingDelete(template)}
                >
                  Poista
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={draft !== null} onOpenChange={(open) => !open && !busy && setDraft(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{draft?.id ? 'Muokkaa pohjaa' : 'Uusi pohja'}</DialogTitle>
            <DialogDescription>
              Määrät ovat ehdotuksia. Lainaaja näkee ne valmiiksi täytettyinä ja voi säätää niitä.
            </DialogDescription>
          </DialogHeader>

          {draft && (
            <div className="flex flex-col gap-4">
              <Field label="Nimi" required htmlFor="template-name">
                <Input
                  id="template-name"
                  value={draft.name}
                  placeholder="esim. Vartion maastoretki"
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </Field>
              <Field
                label="Kuvaus"
                htmlFor="template-description"
                helper="Näkyy lainaajalle setin nimen alla."
              >
                <Textarea
                  id="template-description"
                  value={draft.description}
                  placeholder="esim. Perusvarustus 6 hengen vartiolle viikonlopun retkelle"
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                />
              </Field>

              <Field label="Kamat" required>
                <div className="flex flex-col gap-2">
                  {draft.rows.length === 0 && (
                    <p className="text-sm text-muted-foreground">Ei vielä kamoja.</p>
                  )}
                  {draft.rows.map((row) => {
                    const item = itemsById.get(row.itemId);
                    return (
                      <div key={row.itemId} className="flex items-center gap-2 rounded-md border p-2">
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">
                          {item?.name ?? 'Tuntematon kama'}
                        </span>
                        <NumberInput
                          value={row.amount}
                          min={1}
                          max={item?.amount}
                          onChange={(value) => setRowAmount(row.itemId, value)}
                          className="w-36 shrink-0"
                          aria-label={`${item?.name ?? 'kama'} määrä`}
                        />
                        <span className="w-16 shrink-0 text-xs text-muted-foreground">
                          / {item?.amount ?? '?'} kpl
                        </span>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Poista ${item?.name ?? 'kama'}`}
                          onClick={() => removeRow(row.itemId)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    );
                  })}
                  {/* Pick-only: items are created in the item admin, never here. */}
                  <Select
                    options={availableOptions}
                    value={null}
                    onChange={(option) => option && addRow((option as { value: string }).value)}
                    placeholder="Lisää kama…"
                    noOptionsMessage={() => 'Ei kamoja'}
                  />
                </div>
              </Field>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="secondary" onClick={() => setDraft(null)} disabled={busy}>
              Peruuta
            </Button>
            <Button onClick={save} isLoading={busy} disabled={!canSave}>
              Tallenna
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pendingDelete !== null} onOpenChange={(open) => !open && !busy && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Poista pohja</DialogTitle>
            <DialogDescription>
              Poistetaanko pohja &quot;{pendingDelete?.name}&quot;? Tämä ei vaikuta jo tehtyihin
              lainoihin.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="secondary" onClick={() => setPendingDelete(null)} disabled={busy}>
              Peruuta
            </Button>
            <Button variant="destructive" onClick={remove} isLoading={busy}>
              Poista
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
