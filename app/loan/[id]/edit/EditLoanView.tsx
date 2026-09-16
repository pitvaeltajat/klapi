'use client';

import React, { useMemo, useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '@/utils/datepickerLocale';
import { History, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Item, Loan, LoanStatus, Reservation, ReservationStatus, User } from '@prisma/client';
import Breadcrumbs from '@/components/Breadcrumbs';
import CustomItemDialog from '@/components/CustomItemDialog';
import ItemAmountCard from '@/components/ItemAmountCard';
import LoanerAutocomplete from '@/components/LoanerAutocomplete';
import LoanRangeCalendar from '@/components/LoanRangeCalendar';
import { DateTime } from '@/components/DateTime';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { CreatableSelect } from '@/components/ui/creatable-select';
import { EmptyState } from '@/components/ui/empty-state';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useAvailabilities } from '@/hooks/useAvailabilities';
import { isCustomItemId } from '@/utils/customItems';
import {
  deriveLoanStatus,
  getLoanStatusLabel,
  getReservationStatusLabel,
  getLoanerName,
  MANUAL_LOAN_STATUSES,
  type ManualLoanStatus,
} from '@/utils/loanHelpers';
import { isSameCalendarDay, setDefaultTime, setEndOfDay, type DateRange } from '@/utils/dateRange';

interface LoanWithRelations extends Loan {
  reservations: (Reservation & { item: Item })[];
  user: User;
}

/**
 * One row of the loan being edited — one kama, whatever it is made of. The
 * reservation rows the loan arrived with, the catalogue kamat added here and
 * the loaner's own kamat all reduce to this, so the list has a single shape.
 *
 * Keyed by `itemId` rather than reservation id: two rows of the same kama have
 * no meaning (`updateLoan` sums them by item anyway), so adding one that is
 * already in the list bumps its amount instead of starting a second row.
 *
 * `status` is the reservation status of the row. It is only editable by an
 * admin (per-item status); for everyone else it is carried along untouched so
 * a mixed-state loan survives the recreate-all.
 */
interface Row {
  itemId: string;
  name: string;
  amount: number;
  status: ReservationStatus;
}

const rowsFromLoan = (loan: LoanWithRelations): Row[] => {
  const byItem = new Map<string, Row>();
  for (const r of loan.reservations) {
    const existing = byItem.get(r.itemId);
    if (existing) existing.amount += r.amount;
    else
      byItem.set(r.itemId, {
        itemId: r.itemId,
        name: r.item.name,
        amount: r.amount,
        status: r.status,
      });
  }
  return Array.from(byItem.values());
};

export default function EditLoanView({
  loan,
  items,
  isAdmin,
}: {
  loan: LoanWithRelations;
  items: Item[];
  isAdmin: boolean;
}) {
  const router = useRouter();

  const originalRows = useMemo(() => rowsFromLoan(loan), [loan]);
  const originalAmounts = useMemo(
    () => new Map(originalRows.map((r) => [r.itemId, r.amount])),
    [originalRows],
  );

  const [description, setDescription] = useState(loan.description);
  const [rows, setRows] = useState<Row[]>(originalRows);
  const [range, setRange] = useState<DateRange>([
    new Date(loan.startTime),
    new Date(loan.endTime),
  ]);
  const [status, setStatus] = useState(deriveLoanStatus(loan.reservations, loan.status));
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [saving, setSaving] = useState(false);

  // The loaner picker (admin only). `loanerValue` is the free-text name or the
  // selected account's address; `loanerUserId` is the account the loan belongs
  // to, or undefined while a free-text name is typed (meaning "keep the current
  // account"). Seeded from the loan as it stands.
  const originalLoanerName = getLoanerName(loan);
  const [loanerValue, setLoanerValue] = useState(originalLoanerName);
  const [loanerUserId, setLoanerUserId] = useState<string | undefined>(loan.userId);
  const loanerChanged =
    loanerValue !== originalLoanerName || loanerUserId !== loan.userId;

  const [startDate, endDate] = range;

  // Once the loan is running, re-picking a range rewrites when the kamat were
  // collected — so a non-admin gets a return-day picker and keeps the start it
  // has (`updateLoan` blocks their edit at that point anyway). An admin may
  // move a start that has already passed: a loan handed over a day early is
  // corrected here.
  const loanStarted = new Date(loan.startTime) <= new Date();
  const startLocked = loanStarted && !isAdmin;

  const { availabilities, loading: loadingAvailability } = useAvailabilities({
    start: startDate ?? new Date(loan.startTime),
    end: endDate ?? new Date(loan.endTime),
  });

  const derivedStatus = deriveLoanStatus(loan.reservations, loan.status);
  // PARTIALLY_RETURNED is derived from a mix of reservation statuses, so there
  // is no single value to flatten the lines to and it can't be picked.
  const canSetStatus = isAdmin && derivedStatus !== LoanStatus.PARTIALLY_RETURNED;

  /**
   * How many of a kama this loan may hold. `getAvailabilities` counts every
   * overlapping reservation including this loan's own, so what the loan already
   * booked has to be added back or editing a full loan would look impossible.
   */
  const headroom = (itemId: string): number => {
    if (isCustomItemId(itemId)) return Number.MAX_SAFE_INTEGER;
    const free = availabilities?.[itemId]?.available ?? 0;
    return free + (originalAmounts.get(itemId) ?? 0);
  };

  const setAmount = (itemId: string, amount: number) =>
    setRows((current) =>
      current.map((r) => (r.itemId === itemId ? { ...r, amount } : r)),
    );

  const setRowStatus = (itemId: string, status: ReservationStatus) =>
    setRows((current) =>
      current.map((r) => (r.itemId === itemId ? { ...r, status } : r)),
    );

  // A kama added to the loan mid-edit starts in the same state as the rest of
  // the loan: in use if the loan is running, else reserved. The admin can then
  // change it per row.
  const defaultNewStatus = loan.reservations.some(
    (r) => r.status === ReservationStatus.INUSE,
  )
    ? ReservationStatus.INUSE
    : ReservationStatus.ACCEPTED;

  const addRow = (row: Omit<Row, 'status'> & { status?: ReservationStatus }) =>
    setRows((current) => {
      const existing = current.find((r) => r.itemId === row.itemId);
      if (!existing) return [...current, { ...row, status: row.status ?? defaultNewStatus }];
      return current.map((r) =>
        r.itemId === row.itemId ? { ...r, amount: r.amount + row.amount } : r,
      );
    });

  const rowsDirty =
    rows.length !== originalRows.length ||
    rows.some((r) => originalAmounts.get(r.itemId) !== r.amount);

  // A per-item status change (admin) counts as a change worth saving.
  const statusesDirty =
    isAdmin &&
    rows.some((r) => {
      const original = originalRows.find((o) => o.itemId === r.itemId);
      return original !== undefined && original.status !== r.status;
    });

  const isDirty =
    rowsDirty ||
    statusesDirty ||
    description !== loan.description ||
    (canSetStatus && status !== derivedStatus) ||
    loanerChanged ||
    startDate?.getTime() !== new Date(loan.startTime).getTime() ||
    endDate?.getTime() !== new Date(loan.endTime).getTime();

  const overBooked = rows.filter((r) => r.amount > headroom(r.itemId));

  async function save() {
    if (!startDate || !endDate) return;
    setSaving(true);
    try {
      const response = await fetch('/api/loan/updateLoan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: loan.id,
          description,
          startTime: startDate,
          endTime: endDate,
          reservations: rows.map((r) => ({
            amount: r.amount,
            item: { connect: { id: r.itemId } },
            // Only an oma kama carries a name: it is what updateLoan creates
            // the temporary item from.
            ...(isCustomItemId(r.itemId) ? { name: r.name } : {}),
            // An admin may set each item's status individually. Always sent
            // for an admin (the route only records actual changes in the audit
            // trail); never sent for a non-admin, so their edit can't trip the
            // admin-only guard on the route.
            ...(isAdmin ? { status: r.status } : {}),
          })),
          ...(canSetStatus && status !== derivedStatus ? { status } : {}),
          // Only send the loaner when it actually changed. A free-text name
          // (no account picked) leaves `userId` undefined, so the account is
          // kept while the label is rewritten.
          ...(loanerChanged ? { loaner: loanerValue, userId: loanerUserId } : {}),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.message || 'Virhe', {
          description: Array.isArray(data.details)
            ? data.details.join('\n')
            : data.message || 'Virhe tallennettaessa',
        });
        return;
      }

      toast.success('Laina päivitetty');
      router.push(`/loan/${loan.id}`);
    } catch {
      toast.error('Virhe', { description: 'Yhteysvirhe, yritä uudelleen' });
    } finally {
      setSaving(false);
      setConfirmOpen(false);
    }
  }

  const breadcrumbs = (
    <Breadcrumbs
      items={[
        { label: 'Lainat', href: '/loan' },
        { label: loan.description || 'Ei kuvausta', href: `/loan/${loan.id}` },
        { label: 'Muokkaa' },
      ]}
    />
  );

  if (loadingAvailability) {
    return (
      <>
        {breadcrumbs}
        <div className="flex flex-col gap-6">
          <Skeleton className="h-10 w-64" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <Skeleton className="mb-4 h-6 w-40" />
              <Skeleton className="h-24 w-full" />
            </Card>
          ))}
        </div>
      </>
    );
  }

  const selectableItems = items.map((i) => ({ value: i.id, label: i.name }));
  /** What's still free to add on top of what the loan already holds. */
  const remaining = (itemId: string) =>
    headroom(itemId) - (rows.find((r) => r.itemId === itemId)?.amount ?? 0);

  return (
    <>
      {breadcrumbs}
      <div className="flex flex-col gap-6">
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Tallenna muutokset"
          description="Lainan tiedot päivitetään ja varatut kamat päivittyvät muille näkyviin."
          confirmLabel="Tallenna"
          confirmVariant="success"
          isLoading={saving}
          onConfirm={save}
        />

        <CustomItemDialog
          key={customName}
          isOpen={customOpen}
          onClose={() => setCustomOpen(false)}
          initialName={customName}
          onAdd={({ id, name, amount }) => addRow({ itemId: id, name, amount })}
          title="Lisää oma kama lainaan"
          successMessage="Lisätty lainaan"
          submitIcon={Plus}
        />

        <PageHeader
          className="mb-0"
          title="Muokkaa lainaa"
          actions={<Badge variant="secondary">{getLoanStatusLabel(derivedStatus)}</Badge>}
        />

        {loanStarted && isAdmin && (
          <Alert variant="warning" title="Laina on jo alkanut">
            Noutoaikaa siirtämällä muutat merkintää siitä, milloin kamat noudettiin.
            Saatavuus tarkistetaan muiden lainojen suhteen, joten päällekkäinen aika
            estetään tallennuksessa.
          </Alert>
        )}

        <Card>
          <CardTitle>Perustiedot</CardTitle>
          <dl className="flex flex-col gap-2 text-sm sm:text-base">
            {isAdmin ? (
              <div className="flex flex-col gap-1">
                <dt className="text-muted-foreground">Lainaaja</dt>
                <dd>
                  <LoanerAutocomplete
                    value={loanerValue}
                    onChange={(value, userId) => {
                      setLoanerValue(value);
                      setLoanerUserId(userId);
                    }}
                    placeholder="Lainaajan nimi tai sähköposti"
                    size="md"
                  />
                </dd>
              </div>
            ) : (
              <div className="flex flex-wrap items-baseline gap-x-2">
                <dt className="text-muted-foreground">Lainaaja</dt>
                <dd className="font-medium break-all">
                  {getLoanerName(loan)}
                </dd>
              </div>
            )}
            {isAdmin && (
              <div className="flex flex-wrap items-baseline gap-x-2">
                <dt className="text-muted-foreground">Lainan ID</dt>
                <dd className="font-mono text-sm">{loan.id}</dd>
              </div>
            )}
          </dl>
        </Card>

        {canSetStatus && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>Tila</CardTitle>
                {status !== derivedStatus && <Badge variant="warning">Muokattu</Badge>}
              </div>
              <Button
                aria-label="Palauta alkuperäinen"
                size="icon-sm"
                variant="ghost"
                onClick={() => setStatus(derivedStatus)}
                disabled={status === derivedStatus}
              >
                <History className="h-4 w-4" />
              </Button>
            </CardHeader>
            <NativeSelect
              value={status}
              onChange={(e) => setStatus(e.target.value as ManualLoanStatus)}
            >
              {Object.keys(MANUAL_LOAN_STATUSES).map((s) => (
                <option key={s} value={s}>
                  {getLoanStatusLabel(s as ManualLoanStatus)}
                </option>
              ))}
            </NativeSelect>
            {status !== derivedStatus && (
              <Alert variant="warning" className="mt-3">
                Kaikkien kamojen tila asetetaan lainan uuden tilan mukaiseksi. Saatavuus
                tarkistetaan silti, ja jos kamat eivät ole vapaana, tallennus estetään.
              </Alert>
            )}
          </Card>
        )}

        <Card>
          <CardTitle>Laina-aika</CardTitle>
          {startLocked ? (
            <>
              <dl className="mb-3 flex flex-wrap items-baseline gap-x-2 text-sm sm:text-base">
                <dt className="text-muted-foreground">Nouto</dt>
                <dd className="font-medium">
                  <DateTime value={loan.startTime} format="klo" />
                </dd>
              </dl>
              <Label size="section">Palautuspäivä</Label>
              <div className="flex justify-center overflow-x-auto">
                <DatePicker
                  selected={endDate}
                  onChange={(date: Date | null) => {
                    if (!date || !startDate) return;
                    setRange([
                      startDate,
                      isSameCalendarDay(date, startDate)
                        ? setEndOfDay(date)
                        : setDefaultTime(date),
                    ]);
                  }}
                  inline
                  monthsShown={2}
                  minDate={new Date(loan.startTime)}
                  dateFormat="dd.MM.yyyy"
                />
              </div>
            </>
          ) : (
            <LoanRangeCalendar
              value={range}
              onChange={setRange}
              minDate={loanStarted ? undefined : new Date()}
            />
          )}
        </Card>

        <Card>
          <CardTitle>Kuvaus</CardTitle>
          <Textarea
            value={description ?? ''}
            placeholder="Ei kuvausta"
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kamat</CardTitle>
            <Button
              size="sm"
              variant="ghost"
              className="gap-2"
              onClick={() => setRows(originalRows)}
              disabled={!rowsDirty}
            >
              <History className="h-4 w-4" />
              Palauta alkuperäiset
            </Button>
          </CardHeader>

          {overBooked.length > 0 && (
            <Alert variant="warning" title="Osa kamoista ei mahdu valitulle ajalle" className="mb-3">
              Pienennä alla merkittyjen kamojen määriä, muuten tallennus estetään.
            </Alert>
          )}

          {rows.length === 0 ? (
            <EmptyState variant="inline" title="Ei kamoja" />
          ) : (
            <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
              {rows.map((row) => {
                const original = originalAmounts.get(row.itemId);
                const max = headroom(row.itemId);
                const isCustom = isCustomItemId(row.itemId);
                const originalStatus = originalRows.find((o) => o.itemId === row.itemId)?.status;
                return (
                  <div key={row.itemId} className="flex flex-col gap-1.5">
                    <ItemAmountCard
                      itemId={row.itemId}
                      name={row.name}
                      amount={row.amount}
                      subtitle={
                        isCustom ? (
                          'Oma kama'
                        ) : original === undefined ? (
                          <span className="text-success">Uusi · vapaana {max}</span>
                        ) : original !== row.amount ? (
                          <span className="text-warning">
                            Oli {original} kpl · vapaana {max}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Vapaana {max}</span>
                        )
                      }
                      decrementDisabled={row.amount <= 1}
                      incrementDisabled={row.amount >= max}
                      onDecrement={() => setAmount(row.itemId, row.amount - 1)}
                      onIncrement={() => setAmount(row.itemId, row.amount + 1)}
                      onAmountChange={(next) =>
                        setAmount(row.itemId, Math.min(max, Math.max(1, next)))
                      }
                      onRemove={() =>
                        setRows((current) => current.filter((r) => r.itemId !== row.itemId))
                      }
                      removeLabel={`Poista ${row.name} lainasta`}
                    />
                    {isAdmin && (
                      <div className="flex items-center gap-2 px-1">
                        <Label htmlFor={`status-${row.itemId}`} className="shrink-0 text-xs">
                          Tila
                        </Label>
                        <NativeSelect
                          id={`status-${row.itemId}`}
                          value={row.status}
                          onChange={(e) =>
                            setRowStatus(row.itemId, e.target.value as ReservationStatus)
                          }
                          className="h-8 text-xs"
                        >
                          {Object.values(ReservationStatus).map((s) => (
                            <option key={s} value={s}>
                              {getReservationStatusLabel(s)}
                            </option>
                          ))}
                        </NativeSelect>
                        {originalStatus !== undefined && originalStatus !== row.status && (
                          <Badge variant="warning" className="shrink-0">
                            Muokattu
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <CardTitle>Lisää kama</CardTitle>
          {/* Searchable: the catalogue is long enough that a native select
              means scrolling past a hundred kamaa to find one. A name with no
              match isn't a dead end — it offers to become an oma kama. The
              amount isn't asked for here; the row above adjusts it. */}
          <CreatableSelect<{ value: string; label: string }>
            value={null}
            options={selectableItems}
            // A kama the loan already holds every one of can't be added again.
            // The "create" row isn't a catalogue kama, so it is never blocked.
            isOptionDisabled={(option) =>
              items.some((i) => i.id === option.value) && remaining(option.value) < 1
            }
            onChange={(option) => {
              const item = items.find((i) => i.id === option?.value);
              if (item) addRow({ itemId: item.id, name: item.name, amount: 1 });
            }}
            onCreateOption={(name) => {
              setCustomName(name);
              setCustomOpen(true);
            }}
            formatCreateLabel={(input) => `Lisää oma kama "${input}"`}
            placeholder="Hae kamaa nimellä"
            noOptionsMessage={() => 'Ei osumia'}
          />
        </Card>

        <Button
          variant="success"
          size="lg"
          className="w-full md:w-auto md:self-start"
          disabled={!isDirty || overBooked.length > 0 || !startDate || !endDate}
          onClick={() => setConfirmOpen(true)}
        >
          Tallenna muutokset
        </Button>
      </div>
    </>
  );
}
