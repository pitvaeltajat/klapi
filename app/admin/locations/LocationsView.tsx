'use client';

import { useState } from 'react';
import NextLink from 'next/link';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { CornerDownRight, Package, Plus, Trash2 } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { canBeParent } from '@/utils/locationTree';
import { postJson } from '@/utils/postJson';

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

/**
 * The sijainti tree: "Kalusto / Hylly 3". Pickers elsewhere still mint a
 * top-level sijainti when a name is typed in; this is where it gets put in its
 * place.
 *
 * Any sijainti can be switched to lainattava — a toolbox, a peräkärry — which
 * gives it a kama that goes in the cart and takes the sijainti's whole subtree
 * with it (`utils/containers.ts`). Renaming or moving it here brings the kama
 * along.
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
  /** The row whose "Lisää alasijainti" field is open, and what is typed in it. */
  const [addingUnder, setAddingUnder] = useState<string | null>(null);
  const [childName, setChildName] = useState('');
  const [deleting, setDeleting] = useState(false);

  if (session?.user?.group !== 'ADMIN') return <NotAuthenticated />;

  const rows = locations ?? [];
  const parentOptions = (forId: string | null): Option[] =>
    rows
      .filter((l) => forId === null || canBeParent(rows, forId, l.id))
      .map((l) => ({ value: l.id, label: l.path }));

  const create = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await postJson('/api/location/createLocation', {
        name: newName,
        parentId: newParent?.value ?? null,
      });
      toast.success('Sijainti lisätty', { description: newName.trim() });
      setNewName('');
      await mutate();
    } catch {
      // postJson already toasted.
    } finally {
      setCreating(false);
    }
  };

  // Adding a child where the parent is, rather than scrolling up to the form and
  // finding the parent in a picker: "Kalusto / something" is one click and a name.
  const createChild = async (parent: LocationRow) => {
    const name = childName.trim();
    if (!name) return;
    try {
      await postJson('/api/location/createLocation', { name, parentId: parent.id });
      toast.success('Sijainti lisätty', { description: `${parent.path} / ${name}` });
      setChildName('');
      setAddingUnder(null);
      await mutate();
    } catch {
      // postJson already toasted; keep the field open with what was typed.
    }
  };

  const setLoanable = async (loc: LocationRow, loanable: boolean) => {
    try {
      await postJson('/api/location/setLoanable', { id: loc.id, loanable });
      toast.success(loanable ? 'Sijainti on nyt lainattava' : 'Sijainti ei ole enää lainattava', {
        description: loanable
          ? `${loc.name} löytyy kamoista, ja sen sisältö lähtee mukana lainaan.`
          : `${loc.name} -kama arkistoitiin. Sijainti ja sen sisältö säilyvät.`,
      });
      await mutate();
    } catch {
      // postJson already toasted.
    }
  };

  const update = async (id: string, patch: { name?: string; parentId?: string | null }) => {
    await postJson('/api/location/updateLocation', { id, ...patch });
    await mutate();
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await postJson('/api/location/deleteLocation', { id: deleteTarget.id });
      toast.success('Sijainti poistettu', { description: deleteTarget.path });
      setDeleteTarget(null);
      await mutate();
    } catch {
      // postJson already toasted.
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
                    className="py-3"
                    // Indent by depth so the tree reads without drawing lines.
                    style={{ paddingLeft: `${Math.min(loc.depth, 6) * 1.25}rem` }}
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
                      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                        <InlineEdit
                          value={loc.name}
                          label="nimeä"
                          className="font-medium"
                          validate={(next) => (next ? null : 'Anna sijainnille nimi')}
                          onSave={(name) => update(loc.id, { name })}
                        />
                        <span className="text-sm text-muted-foreground">
                          {loc._count.items} kamaa
                        </span>
                        {loc.item && (
                          <NextLink href={`/item/${loc.item.id}`} title="Avaa lainattava kama">
                            <Badge variant="default" className="gap-1 hover:underline">
                              <Package className="h-3 w-3" aria-hidden /> Lainattava
                            </Badge>
                          </NextLink>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Switch
                            checked={Boolean(loc.item)}
                            onCheckedChange={(on) => setLoanable(loc, on)}
                            aria-label={`${loc.name}: lainattava`}
                          />
                          <span className="md:hidden lg:inline">Lainattava</span>
                        </label>
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
                          aria-label={`Lisää alasijainti: ${loc.name}`}
                          title="Lisää alasijainti"
                          onClick={() => {
                            setChildName('');
                            setAddingUnder(addingUnder === loc.id ? null : loc.id);
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`Poista ${loc.name}`}
                          // Emptying it first is the only safe order: kamat
                          // cascade away with their sijainti.
                          disabled={loc._count.items > 0 || Boolean(loc.item)}
                          title={
                            loc.item
                              ? 'Poista lainattavuus ensin'
                              : loc._count.items > 0
                                ? 'Siirrä kamat ensin muualle'
                                : undefined
                          }
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteTarget(loc)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {addingUnder === loc.id && (
                      <form
                        className="mt-2 flex items-center gap-2 pl-5"
                        onSubmit={(e) => {
                          e.preventDefault();
                          void createChild(loc);
                        }}
                      >
                        <CornerDownRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                        <Input
                          autoFocus
                          value={childName}
                          onChange={(e) => setChildName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') setAddingUnder(null);
                          }}
                          placeholder={`Uusi sijainti kohteeseen ${loc.name}`}
                          aria-label={`Uuden alasijainnin nimi: ${loc.path}`}
                          className="max-w-sm"
                        />
                        <Button type="submit" size="sm" disabled={!childName.trim()}>
                          Lisää
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => setAddingUnder(null)}>
                          Peruuta
                        </Button>
                      </form>
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
