'use client';

import { useState } from 'react';
import NextLink from 'next/link';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Package, Plus, Trash2 } from 'lucide-react';
import NotAuthenticated from '@/components/NotAuthenticated';
import Breadcrumbs from '@/components/Breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Select } from '@/components/ui/creatable-select';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { InlineEdit } from '@/components/ui/inline-edit';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { canBeParent } from '@/utils/locationTree';

interface LocationRow {
  id: string;
  name: string;
  parentId: string | null;
  itemId: string | null;
  item: { id: string; locationId: string | null } | null;
  path: string;
  depth: number;
  _count: { items: number; children: number };
}

interface Option {
  value: string;
  label: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

async function post(url: string, body: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    toast.error(data.message || 'Tallennus epäonnistui');
    throw new Error(data.message);
  }
  return data;
}

/**
 * The sijainti tree: "Kalusto / Hylly 3". Pickers elsewhere still mint a
 * top-level sijainti when a name is typed in; this is where it gets put in its
 * place. A säilytyspaikka shows up in the tree under wherever its kama is
 * stored, but is read-only here — its name and place belong to the kama.
 */
export default function LocationsView() {
  const { data: session } = useSession();
  const {
    data: locations,
    isLoading,
    mutate,
  } = useSWR<LocationRow[]>('/api/location/getLocations', fetcher);

  const [newName, setNewName] = useState('');
  const [newParent, setNewParent] = useState<Option | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LocationRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (session?.user?.group !== 'ADMIN') return <NotAuthenticated />;

  const rows = locations ?? [];
  // Only a plain sijainti can hold another one — see `refuseParent`.
  const parentOptions = (forId: string | null): Option[] =>
    rows
      .filter((l) => !l.itemId && (forId === null || canBeParent(rows, forId, l.id)))
      .map((l) => ({ value: l.id, label: l.path }));

  const create = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await post('/api/location/createLocation', {
        name: newName,
        parentId: newParent?.value ?? null,
      });
      toast.success('Sijainti lisätty', { description: newName.trim() });
      setNewName('');
      await mutate();
    } catch {
      // post() already toasted.
    } finally {
      setCreating(false);
    }
  };

  const update = async (id: string, patch: { name?: string; parentId?: string | null }) => {
    await post('/api/location/updateLocation', { id, ...patch });
    await mutate();
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await post('/api/location/deleteLocation', { id: deleteTarget.id });
      toast.success('Sijainti poistettu', { description: deleteTarget.path });
      setDeleteTarget(null);
      await mutate();
    } catch {
      // post() already toasted.
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Breadcrumbs items={[{ label: 'Kamat', href: '/?browse=1' }, { label: 'Sijainnit' }]} />
      <PageHeader title="Sijainnit" />

      <div className="flex flex-col gap-6">
        <Card>
          <CardTitle>Uusi sijainti</CardTitle>
          <form
            className="flex flex-col gap-3 md:flex-row md:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              void create();
            }}
          >
            <Field label="Nimi" htmlFor="new-location-name" className="md:flex-1">
              <Input
                id="new-location-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Hylly 3"
              />
            </Field>
            <Field label="Sijaitsee" htmlFor="new-location-parent" className="md:flex-1">
              <Select<Option>
                inputId="new-location-parent"
                options={parentOptions(null)}
                value={newParent}
                onChange={(option) => setNewParent(option)}
                isClearable
                placeholder="Ylin taso"
                noOptionsMessage={() => 'Ei sijainteja'}
              />
            </Field>
            <Button type="submit" className="gap-2" isLoading={creating} disabled={!newName.trim()}>
              <Plus className="h-4 w-4" /> Lisää
            </Button>
          </form>
        </Card>

        <Card>
          <CardTitle>Kaikki sijainnit</CardTitle>
          {isLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState variant="inline" title="Ei sijainteja" />
          ) : (
            <ul className="divide-y">
              {rows.map((loc) => {
                const parentValue = loc.parentId
                  ? (parentOptions(loc.id).find((o) => o.value === loc.parentId) ?? null)
                  : null;
                return (
                  <li
                    key={loc.id}
                    className="flex flex-col gap-2 py-3 md:flex-row md:items-center md:gap-4"
                    // Indent by depth so the tree reads without drawing lines.
                    style={{ paddingLeft: `${Math.min(loc.depth, 6) * 1.25}rem` }}
                  >
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                      {loc.item ? (
                        <>
                          <Package className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                          <NextLink href={`/item/${loc.item.id}`} className="font-medium hover:underline">
                            {loc.name}
                          </NextLink>
                          <Badge variant="secondary">Säilytyspaikka</Badge>
                        </>
                      ) : (
                        <InlineEdit
                          value={loc.name}
                          label="nimeä"
                          className="font-medium"
                          validate={(next) => (next ? null : 'Anna sijainnille nimi')}
                          onSave={(name) => update(loc.id, { name })}
                        />
                      )}
                      <span className="text-sm text-muted-foreground">
                        {loc._count.items} kamaa
                      </span>
                    </div>

                    {!loc.item && (
                      <div className="flex items-center gap-2">
                        <div className="min-w-0 flex-1 md:w-64 md:flex-none">
                          <Select<Option>
                            aria-label={`${loc.name}: sijaitsee`}
                            options={parentOptions(loc.id)}
                            value={parentValue}
                            onChange={(option) => {
                              if ((option?.value ?? null) === loc.parentId) return;
                              update(loc.id, { parentId: option?.value ?? null }).then(
                                () => toast.success('Sijainti siirretty'),
                                () => {},
                              );
                            }}
                            isClearable
                            placeholder="Ylin taso"
                            noOptionsMessage={() => 'Ei sijainteja'}
                          />
                        </div>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`Poista ${loc.name}`}
                          // Emptying it first is the only safe order: kamat
                          // cascade away with their sijainti.
                          disabled={loc._count.items > 0}
                          title={loc._count.items > 0 ? 'Siirrä kamat ensin muualle' : undefined}
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteTarget(loc)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Poista sijainti"
        description={
          deleteTarget && deleteTarget._count.children > 0
            ? `${deleteTarget.path} poistetaan. Sen alasijainnit siirtyvät tasoa ylemmäs.`
            : `${deleteTarget?.path} poistetaan.`
        }
        confirmLabel="Poista"
        confirmVariant="destructive"
        isLoading={deleting}
        onConfirm={remove}
      />
    </>
  );
}
