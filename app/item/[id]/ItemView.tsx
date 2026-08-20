'use client';

import { Item, Category, Reservation, LoanStatus, ItemHistoryAction } from '@prisma/client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { toast } from 'sonner';
import ReservationTable from '@/components/ReservationTable';
import Breadcrumbs from '@/components/Breadcrumbs';
import { ArrowUpCircle, TriangleAlert } from 'lucide-react';
import { DateTime } from '@/components/DateTime';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { Card, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { CreatableSelect } from '@/components/ui/creatable-select';
import { InlineEdit, InlineEditShell } from '@/components/ui/inline-edit';
import {
  getItemHistoryActionLabel,
  formatItemHistoryChanges,
  isBulkItemHistory,
} from '@/utils/itemHelpers';
import EditItemDialog from '@/components/EditItemDialog';
import ItemPhoto from '@/components/ItemPhoto';
import PromoteItemDialog from '@/components/PromoteItemDialog';
import { ApiError, readJson } from '@/utils/apiError';
import ItemNotices, { type ItemAnnouncement, type ItemReport } from './ItemNotices';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface ItemHistoryEntry {
  id: string;
  action: ItemHistoryAction;
  details: unknown;
  createdAt: string | Date;
  actedBy: { id: string; name: string | null; email: string | null } | null;
}

interface ItemWithRelations extends Item {
  categories: Category[];
  location: { id: string; name: string } | null;
  announcements: ItemAnnouncement[];
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

interface SelectOption {
  value: string;
  label: string;
}

export default function ItemView({
  item: itemProp,
  history,
  reportAffectedItems: reportAffectedItemsProp = [],
}: {
  item: ItemWithRelations;
  history: ItemHistoryEntry[];
  reportAffectedItems?: ItemReport[];
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = session?.user?.group === 'ADMIN';

  // The inline editors write straight into this copy so an edit shows the
  // instant it is saved; `router.refresh()` then re-runs the page and the fresh
  // props reseed it (which is also how the muokkaushistoria below catches up).
  const [item, setItem] = useState(itemProp);
  const [seed, setSeed] = useState(itemProp);
  if (itemProp !== seed) {
    setSeed(itemProp);
    setItem(itemProp);
  }

  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [promoteOpen, setPromoteOpen] = useState(false);

  // Only an admin can open the pickers, and both endpoints are admin-only —
  // fetch them lazily so a plain item page never pays for the requests.
  const [locationEditing, setLocationEditing] = useState(false);
  const [categoriesEditing, setCategoriesEditing] = useState(false);
  const pickersOpen = locationEditing || categoriesEditing;
  const { data: allCategories = [] } = useSWR<{ id: string; name: string }[]>(
    pickersOpen ? '/api/category/getCategories' : null,
    fetcher,
  );
  const { data: allLocations = [] } = useSWR<{ id: string; name: string }[]>(
    pickersOpen ? '/api/location/getLocations' : null,
    fetcher,
  );

  const [locationDraft, setLocationDraft] = useState<SelectOption | null>(null);
  const [categoriesDraft, setCategoriesDraft] = useState<SelectOption[]>([]);
  const [relationSaving, setRelationSaving] = useState(false);

  const reportAffectedItems = [...reportAffectedItemsProp].sort(
    (a, b) =>
      new Date(b.report.createdAt).getTime() - new Date(a.report.createdAt).getTime(),
  );

  // Admin-only at-a-glance flag: does this kama have an untriaged huomio on it?
  // They aren't fetched for non-admins, so this is always 0 for them.
  const openReportCount = reportAffectedItems.filter(
    ({ report }) => report.status === 'OPEN' || report.status === 'IN_PROGRESS',
  ).length;

  const isTemporary = item.type === 'temporary';

  const reportSaveError = (err: unknown, fallback: string) => {
    toast.error(err instanceof Error ? err.message : fallback, {
      description: err instanceof ApiError ? err.detail : undefined,
    });
  };

  /**
   * One field, one PATCH — the same route the inventory table's inline cells
   * use, so an edit made here shows up in the muokkaushistoria the same way.
   * Rethrows so the editor stays open on a failure with the typing intact.
   */
  const patchField = async (
    field: 'name' | 'description' | 'amount',
    value: string | number | null,
  ) => {
    try {
      const response = await fetch('/api/item/patchItem', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, field, value }),
      });
      const updated = await readJson<Pick<Item, 'name' | 'description' | 'amount'>>(
        response,
        'Tallennus epäonnistui',
      );
      setItem((current) => ({
        ...current,
        name: updated.name,
        description: updated.description,
        amount: updated.amount,
      }));
      toast.success('Tallennettu');
      router.refresh();
    } catch (err) {
      reportSaveError(err, 'Tallennus epäonnistui');
      throw err;
    }
  };

  /**
   * Sijainti and kategoriat go through editItem, which is the only route that
   * can mint a Location or a Category the admin typed instead of picked. It
   * leaves out any key it isn't sent, so one picker never overwrites the other.
   */
  const saveRelations = async (patch: {
    locationId?: SelectOption | null;
    categories?: { id: string; name: string }[];
  }) => {
    setRelationSaving(true);
    try {
      const response = await fetch('/api/item/editItem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          name: item.name,
          description: item.description,
          amount: item.amount,
          ...patch,
        }),
      });
      await readJson(response, 'Tallennus epäonnistui');
      toast.success('Tallennettu');
      // A freshly typed sijainti/kategoria has no real id yet — show the label
      // now and let the refresh below replace it with the stored row.
      setItem((current) => ({
        ...current,
        ...('locationId' in patch
          ? {
              locationId: patch.locationId?.value ?? null,
              location: patch.locationId
                ? { id: patch.locationId.value, name: patch.locationId.label }
                : null,
            }
          : {}),
        ...(patch.categories
          ? {
              categories: patch.categories.map((category) => ({
                ...category,
                description: null,
              })),
            }
          : {}),
      }));
      router.refresh();
      return true;
    } catch (err) {
      reportSaveError(err, 'Tallennus epäonnistui');
      return false;
    } finally {
      setRelationSaving(false);
    }
  };

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

  const categoryBadges =
    item.categories.length > 0 ? (
      <span className="flex flex-wrap gap-2">
        {item.categories.map((category) => (
          <Badge key={category.id}>{category.name}</Badge>
        ))}
      </span>
    ) : (
      <span className="text-lg font-bold text-muted-foreground">—</span>
    );

  return (
    <>
      <Breadcrumbs items={[{ label: item.name }]} />
      <div className="flex flex-col gap-6">
        <PageHeader
          className="mb-0"
          title={
            <InlineEdit
              value={item.name}
              disabled={!isAdmin}
              label="nimeä"
              inputClassName="h-auto py-1 text-2xl font-semibold sm:text-3xl"
              validate={(next) => (next ? null : 'Nimi on pakollinen')}
              onSave={(next) => patchField('name', next)}
            />
          }
          actionsAlign="inline"
          actions={
            isAdmin && (
              <>
                {isTemporary && <Badge variant="warning">Väliaikainen</Badge>}
                {openReportCount > 0 && (
                  <a
                    href="#huomiot"
                    className="no-underline"
                    aria-label={`${openReportCount} käsittelemätöntä huomiota`}
                  >
                    <Badge variant="destructive" className="gap-1">
                      <TriangleAlert className="size-3.5" aria-hidden />
                      {openReportCount === 1
                        ? 'Käsittelemätön huomio'
                        : `${openReportCount} käsittelemätöntä huomiota`}
                    </Badge>
                  </a>
                )}
              </>
            )
          }
        />

        {isAdmin && isTemporary && (
          <Alert variant="info" title="Väliaikainen kama">
            Lainaaja lisäsi tämän itse omaan koriinsa, joten se ei näy kaluston listauksessa.
            Siirrä se kirjastoon, jos kama jää pysyvästi kalustoon.
          </Alert>
        )}

        {(item.description || isAdmin) && (
          <p className="text-base text-foreground/90 md:text-lg">
            <InlineEdit
              value={item.description ?? ''}
              disabled={!isAdmin}
              label="kuvausta"
              multiline
              emptyLabel="Ei kuvausta"
              placeholder="Viihteeksi reissuille kaluston vessaan."
              inputClassName="text-base md:text-lg"
              onSave={(next) => patchField('description', next || null)}
            />
          </p>
        )}

        {/* Two columns from the smallest size: these are two or three short
            values, and stacking them label-over-value pushed the photo a full
            screen down on a phone. */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Määrä:</p>
            <InlineEdit
              value={String(item.amount)}
              disabled={!isAdmin}
              label="määrää"
              type="number"
              min={1}
              validate={(next) => {
                const parsed = Number(next);
                return Number.isInteger(parsed) && parsed >= 1
                  ? null
                  : 'Määrän tulee olla positiivinen kokonaisluku';
              }}
              onSave={(next) => patchField('amount', Number(next))}
            >
              <span className="text-lg font-bold">{item.amount} kpl</span>
            </InlineEdit>
          </div>

          {(item.location || isAdmin) && (
            <div>
              <p className="text-sm font-semibold text-muted-foreground">Sijainti:</p>
              <InlineEditShell
                label="sijaintia"
                disabled={!isAdmin}
                editing={locationEditing}
                saving={relationSaving}
                display={
                  item.location ? (
                    <span className="text-lg font-bold">{item.location.name}</span>
                  ) : (
                    <span className="text-lg font-bold text-muted-foreground">—</span>
                  )
                }
                onStart={() => {
                  setLocationDraft(
                    item.location
                      ? { value: item.location.id, label: item.location.name }
                      : null,
                  );
                  setLocationEditing(true);
                }}
                onCancel={() => setLocationEditing(false)}
                onSave={async () => {
                  if (await saveRelations({ locationId: locationDraft })) {
                    setLocationEditing(false);
                  }
                }}
              >
                <CreatableSelect
                  aria-label="Sijainti"
                  placeholder="Kolon vessa"
                  value={locationDraft}
                  options={allLocations.map((loc) => ({ value: loc.id, label: loc.name }))}
                  onChange={(option) => setLocationDraft(option as SelectOption | null)}
                  isClearable
                />
              </InlineEditShell>
            </div>
          )}

          {(item.categories.length > 0 || isAdmin) && (
            <div className="col-span-2 md:col-span-1">
              <p className="mb-2 text-sm font-semibold text-muted-foreground">Kategoriat:</p>
              <InlineEditShell
                label="kategorioita"
                disabled={!isAdmin}
                editing={categoriesEditing}
                saving={relationSaving}
                display={categoryBadges}
                onStart={() => {
                  setCategoriesDraft(
                    item.categories.map((category) => ({
                      value: category.id,
                      label: category.name,
                    })),
                  );
                  setCategoriesEditing(true);
                }}
                onCancel={() => setCategoriesEditing(false)}
                onSave={async () => {
                  const saved = await saveRelations({
                    categories: categoriesDraft.map((option) => ({
                      id: option.value,
                      name: option.label,
                    })),
                  });
                  if (saved) setCategoriesEditing(false);
                }}
              >
                <CreatableSelect
                  aria-label="Kategoriat"
                  isMulti
                  placeholder="Valitse tai luo kategorioita"
                  value={categoriesDraft}
                  options={allCategories.map((cat) => ({ value: cat.id, label: cat.name }))}
                  onChange={(options) => setCategoriesDraft([...(options as SelectOption[])])}
                />
              </InlineEditShell>
            </div>
          )}
        </div>

        <hr />

        <ItemPhoto itemId={item.id} itemName={item.name} />

        {isAdmin && (
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setEditOpen(true)}>Muokkaa</Button>
            {isTemporary && (
              <Button variant="success" className="gap-2" onClick={() => setPromoteOpen(true)}>
                <ArrowUpCircle className="h-4 w-4" />
                Siirrä kirjastoon
              </Button>
            )}
            <Button variant="destructive" onClick={() => setOpen(true)}>
              Poista
            </Button>
          </div>
        )}

        <ItemNotices
          itemId={item.id}
          announcements={item.announcements}
          reports={reportAffectedItems}
          isAdmin={isAdmin}
        />

        <Card as="section">
          <CardTitle>Lainat ja varaukset</CardTitle>
          {item.reservations.length === 0 ? (
            <EmptyState variant="inline" title="Ei lainoja eikä varauksia." />
          ) : (
            <ReservationTable reservations={item.reservations} isAdmin={isAdmin} />
          )}
        </Card>

        {isAdmin && (
          <Card as="section">
            <CardTitle>Muokkaushistoria</CardTitle>
            {history.length === 0 ? (
              <EmptyState variant="inline" title="Ei muokkaushistoriaa." />
            ) : (
              <ul className="flex flex-col gap-3">
                {history.map((entry) => {
                  const who = entry.actedBy?.name || entry.actedBy?.email || 'Järjestelmä';
                  const changes = formatItemHistoryChanges(entry.details);
                  const bulk = isBulkItemHistory(entry.details);
                  return (
                    <Card as="li" key={entry.id} variant="inset" padding="sm">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="font-semibold">
                          {getItemHistoryActionLabel(entry.action)}
                        </p>
                        <DateTime
                          value={entry.createdAt}
                          format="numeric"
                          className="text-sm text-muted-foreground"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {who}
                        {bulk && ' · joukkotoiminto'}
                      </p>
                      {changes.length > 0 && (
                        <ul className="mt-2 flex flex-col gap-0.5 text-sm text-foreground/90">
                          {changes.map((line, i) => (
                            <li key={i}>{line}</li>
                          ))}
                        </ul>
                      )}
                    </Card>
                  );
                })}
              </ul>
            )}
          </Card>
        )}
      </div>

      {/* Mounted only while open so the form always seeds fresh from `item`. */}
      {isAdmin && editOpen && (
        <EditItemDialog item={item} open onOpenChange={setEditOpen} />
      )}

      {isAdmin && promoteOpen && (
        <PromoteItemDialog
          item={item}
          onOpenChange={setPromoteOpen}
          onSuccess={() => router.refresh()}
        />
      )}

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Poistetaanko kama?"
        confirmLabel="Poista"
        onConfirm={deleteItem}
        className="mx-4"
      >
        <strong>{item.name}</strong> poistetaan. Oletko varma?
      </ConfirmDialog>
    </>
  );
}
