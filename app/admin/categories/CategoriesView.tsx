'use client';

import { useState } from 'react';
import NextLink from 'next/link';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import NotAuthenticated from '@/components/NotAuthenticated';
import Breadcrumbs from '@/components/Breadcrumbs';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { InlineEdit } from '@/components/ui/inline-edit';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { postJson } from '@/utils/postJson';

interface CategoryRow {
  id: string;
  name: string;
  _count: { items: number };
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/**
 * Kategoriat without going through a kama: create, rename (every kama in it
 * follows) and delete (the kamat only lose the tag). Reached from the Kamat
 * view's header, next to Sijainnit.
 */
export default function CategoriesView() {
  const { data: session } = useSession();
  const { data, isLoading, mutate } = useSWR<CategoryRow[]>('/api/category/getCategories', fetcher);

  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CategoryRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (session?.user?.group !== 'ADMIN') return <NotAuthenticated />;

  const rows = data ?? [];

  const create = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      await postJson('/api/category/createCategory', { name });
      toast.success('Kategoria lisätty', { description: name });
      setNewName('');
      await mutate();
    } catch {
      // postJson already toasted.
    } finally {
      setCreating(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await postJson('/api/category/deleteCategory', { id: deleteTarget.id });
      toast.success('Kategoria poistettu', { description: deleteTarget.name });
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
      <Breadcrumbs items={[{ label: 'Kamat', href: '/?browse=1' }, { label: 'Kategoriat' }]} />
      <PageHeader title="Kategoriat" />

      <div className="flex flex-col gap-6">
        <Card>
          <CardTitle>Uusi kategoria</CardTitle>
          <form
            className="flex flex-col gap-3 md:flex-row md:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              void create();
            }}
          >
            <Field label="Nimi" htmlFor="new-category-name" className="md:flex-1">
              <Input
                id="new-category-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Työkalut"
              />
            </Field>
            <Button type="submit" className="gap-2" isLoading={creating} disabled={!newName.trim()}>
              <Plus className="h-4 w-4" /> Lisää
            </Button>
          </form>
        </Card>

        <Card>
          <CardTitle>Kaikki kategoriat</CardTitle>
          {isLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState variant="inline" title="Ei kategorioita" />
          ) : (
            <ul className="divide-y">
              {rows.map((cat) => (
                <li key={cat.id} className="flex items-center gap-2 py-3">
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    <InlineEdit
                      value={cat.name}
                      label="nimeä"
                      className="font-medium"
                      validate={(next) => (next ? null : 'Anna kategorialle nimi')}
                      onSave={async (name) => {
                        await postJson('/api/category/updateCategory', { id: cat.id, name });
                        await mutate();
                      }}
                    />
                    <NextLink
                      href={`/?browse=1&category=${cat.id}`}
                      className="text-sm text-muted-foreground hover:underline"
                    >
                      {cat._count.items} kamaa
                    </NextLink>
                  </div>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Poista ${cat.name}`}
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteTarget(cat)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Poista kategoria"
        description={
          deleteTarget && deleteTarget._count.items > 0
            ? `${deleteTarget.name} poistetaan ${deleteTarget._count.items} kamalta. Kamat itse säilyvät.`
            : `${deleteTarget?.name} poistetaan.`
        }
        confirmLabel="Poista"
        confirmVariant="destructive"
        isLoading={deleting}
        onConfirm={remove}
      />
    </>
  );
}
