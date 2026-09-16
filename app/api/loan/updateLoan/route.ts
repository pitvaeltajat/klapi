import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { activeItemsWhere } from '@/utils/itemQueries';
import { LoanStatus, ReservationStatus, Prisma } from '@prisma/client';
import { logLoanHistory, resolveLoanActor } from '@/utils/loanHistory';
import { MANUAL_LOAN_STATUSES, isManualLoanStatus, deriveLoanStatus } from '@/utils/loanHelpers';
import { requireUser } from '@/utils/apiAuth';
import { syncLoanCalendarInBackground } from '@/utils/loanCalendar';
import { isCustomItemId } from '@/utils/customItems';
import { createTemporaryItems } from '@/utils/temporaryItems';
import { computeAvailabilities } from '@/utils/availability';

export async function POST(request: Request) {
  try {
    const { session, denied } = await requireUser();
    if (denied) return denied;

    const { id, reservations, startTime, endTime, description, status, userId, loaner } =
      await request.json();

    // Check that user is admin or owns this loan
    const existingLoan = await prisma.loan.findUnique({
      where: { id },
      select: {
        userId: true,
        status: true,
        deletedAt: true,
        startTime: true,
        endTime: true,
        loaner: true,
        reservations: { select: { status: true, itemId: true, amount: true } },
      },
    });

    if (!existingLoan) {
      return NextResponse.json({ message: 'Lainaa ei löydy' }, { status: 404 });
    }

    // A deleted loan is restored first, then edited — never edited in place.
    if (existingLoan.deletedAt) {
      return NextResponse.json({ message: 'Poistettua lainaa ei voi muokata' }, { status: 409 });
    }

    const isAdmin = session.user.group === 'ADMIN';
    const isKiosk = session.user.group === 'KIOSK';
    const isOwner = session.user.id === existingLoan.userId;

    if (!isAdmin && !isKiosk && !isOwner) {
      return NextResponse.json(
        { message: 'Sinulla ei ole oikeutta muokata tätä lainaa' },
        { status: 403 },
      );
    }

    // Only an admin may reassign the loan to another member or rewrite the
    // free-text loaner name — the loaner picker in the edit form is admin-only.
    let newUserId: string | undefined;
    let newLoaner: string | undefined;
    if (userId !== undefined || loaner !== undefined) {
      if (!isAdmin) {
        return NextResponse.json(
          { message: 'Vain ylläpitäjä voi vaihtaa lainaajaa' },
          { status: 403 },
        );
      }
      if (userId !== undefined && userId !== null && userId !== existingLoan.userId) {
        const target = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true },
        });
        if (!target) {
          return NextResponse.json({ message: 'Käyttäjää ei löytynyt' }, { status: 404 });
        }
        newUserId = userId;
      }
      if (loaner !== undefined && loaner !== null) {
        newLoaner = String(loaner).trim();
      }
    }

    // An admin may set the loan's status by hand (e.g. an item handed back
    // early: käytössä → hyväksytty). Everything else about the edit — the
    // availability/overlap check below included — still applies.
    let manualStatus: keyof typeof MANUAL_LOAN_STATUSES | undefined;
    if (status !== undefined && status !== null) {
      if (!isAdmin) {
        return NextResponse.json(
          { message: 'Vain ylläpitäjä voi vaihtaa lainan tilaa' },
          { status: 403 },
        );
      }
      if (!isManualLoanStatus(status)) {
        return NextResponse.json({ message: `Tuntematon tila: ${status}` }, { status: 400 });
      }
      manualStatus = status;
    }

    // Non-admin owners can only edit before the loan has started.
    // Kiosk is exempt — they edit at the checkout moment, when the start time has typically passed.
    if (!isAdmin && !isKiosk && existingLoan.startTime <= new Date()) {
      return NextResponse.json(
        { message: 'Lainaa ei voi enää muokata: lainaus on jo alkanut' },
        { status: 403 },
      );
    }

    // Non-admin users can only edit if reservation statuses allow
    // Check if any reservation is INUSE or RETURNED
    const hasInuseOrReturned = existingLoan.reservations.some(
      (r) => r.status === ReservationStatus.INUSE || r.status === ReservationStatus.RETURNED,
    );
    if (!isAdmin && hasInuseOrReturned) {
      return NextResponse.json({ message: 'Lainaa ei voi muokata tässä tilassa' }, { status: 403 });
    }

    // Validate availability for each item in reservations. A row carrying a
    // `name` under a `custom-…` id is an "oma kama" typed into the edit form;
    // it has no Item row yet, so it is created further down (once the rest of
    // the edit has validated) rather than looked up here.
    const requestedReservations = reservations as Array<{
      amount: number;
      name?: string;
      item: { connect: { id: string } };
      /** An admin-set per-item status (e.g. one kama of a partial return). */
      status?: ReservationStatus;
    }>;

    // An admin may set each item's status individually, on top of (or instead
    // of) the whole-loan status. Only an admin may, and the value must be a
    // real reservation status — a bogus one would otherwise be written straight
    // into the recreate-all below.
    const hasPerItemStatus = requestedReservations.some((r) => r.status !== undefined);
    if (hasPerItemStatus && !isAdmin) {
      return NextResponse.json(
        { message: 'Vain ylläpitäjä voi vaihtaa yksittäisen kaman tilaa' },
        { status: 403 },
      );
    }
    for (const r of requestedReservations) {
      if (r.status !== undefined && !Object.values(ReservationStatus).includes(r.status)) {
        return NextResponse.json(
          { message: `Tuntematon kaman tila: ${r.status}` },
          { status: 400 },
        );
      }
    }

    // Get all items to check their total amounts. Skip archived items so an
    // edit cannot pull a previously soft-deleted item back into a loan.
    const items = await prisma.item.findMany({ where: activeItemsWhere });
    const itemMap = new Map(items.map((item) => [item.id, item]));

    const customReservations = requestedReservations.filter(
      (r) => !itemMap.has(r.item.connect.id) && isCustomItemId(r.item.connect.id),
    );
    for (const r of customReservations) {
      if (!r.name?.trim()) {
        return NextResponse.json(
          { message: `Omalta kamalta puuttuu nimi (${r.item.connect.id})` },
          { status: 400 },
        );
      }
    }
    const customIds = new Set(customReservations.map((r) => r.item.connect.id));

    const requestedStart = new Date(startTime);
    const requestedEnd = new Date(endTime);

    // An admin correcting a loan that has already started (or been returned) is
    // fixing the record, not reserving gear — the kamat were already used, so a
    // retroactive edit can't double-book anything. Skip the availability check
    // for those; future-dated admin edits still enforce it, as do all non-admin
    // edits.
    const loanStarted = existingLoan.startTime <= new Date();
    const skipAvailability = isAdmin && loanStarted;

    if (!skipAvailability) {
      // The same sums the browser was shown — including "the box is out, so what
      // is in it is out" — rather than a second copy of the arithmetic that can
      // drift from it. The loan's own lines are excluded: it is already holding
      // some of what it is asking for.
      const availabilities = await computeAvailabilities(
        { start: requestedStart, end: requestedEnd },
        { excludeLoanId: id },
      );

      // Aggregate requested amounts by item
      // Custom kamat are the loaner's own gear, not the troop's, so there is
      // nothing to check them against — they never enter the availability sums.
      const requestedByItem = new Map<string, number>();
      for (const res of requestedReservations) {
        const itemId = res.item.connect.id;
        if (customIds.has(itemId)) continue;
        const current = requestedByItem.get(itemId) ?? 0;
        requestedByItem.set(itemId, current + res.amount);
      }

      // Validate each item's availability
      const unavailableItems: string[] = [];
      for (const [itemId, requestedAmount] of Array.from(requestedByItem.entries())) {
        const item = itemMap.get(itemId);
        if (!item) {
          unavailableItems.push(`Tuotetta (${itemId}) ei löydy`);
          continue;
        }

        const availability = availabilities[itemId];
        const available = availability?.available ?? 0;

        if (requestedAmount > available) {
          unavailableItems.push(
            availability?.blockedBy
              ? `${item.name}: on lainatun kaman "${availability.blockedBy.name}" sisällä`
              : `${item.name}: pyydetty ${requestedAmount}, vapaana ${available}`,
          );
        }
      }

      if (unavailableItems.length > 0) {
        return NextResponse.json(
          {
            message: 'Saatavuusvirhe: joitain tuotteita ei ole riittävästi vapaana',
            details: unavailableItems,
          },
          { status: 400 },
        );
      }
    }

    // Preserve each existing reservation's status so a mixed-state loan (e.g.
    // PARTIALLY_RETURNED) survives the recreate-all below. New lines default to
    // INUSE when the loan is in use, else ACCEPTED. An admin-set loan status
    // still wins and is flattened onto every line.
    const statusByItem = new Map(existingLoan.reservations.map((r) => [r.itemId, r.status]));
    const hasInuse = existingLoan.reservations.some((r) => r.status === ReservationStatus.INUSE);
    const defaultNewStatus = hasInuse ? ReservationStatus.INUSE : ReservationStatus.ACCEPTED;

    // Only now — with availability settled — do the loaner's own kamat become
    // real rows, so a rejected edit doesn't leave orphan items behind.
    const customIdByOriginal = await createTemporaryItems(
      customReservations.map((r) => ({
        itemId: r.item.connect.id,
        name: r.name!.trim(),
        amount: r.amount,
      })),
    );

    const resolvedReservations = requestedReservations.map((r) => ({
      amount: r.amount,
      itemId: customIdByOriginal.get(r.item.connect.id) ?? r.item.connect.id,
      name: r.name?.trim(),
      status: r.status,
    }));

    // A per-item status (admin) wins over the preserved status; the whole-loan
    // manual status still wins over everything and is flattened onto every line.
    const reservationsWithStatus = resolvedReservations.map((r) => ({
      amount: r.amount,
      item: { connect: { id: r.itemId } },
      status: manualStatus
        ? MANUAL_LOAN_STATUSES[manualStatus]
        : (r.status ?? statusByItem.get(r.itemId) ?? defaultNewStatus),
    }));

    // Build a diff of reservation changes for history. A kama created a moment
    // ago isn't in `itemMap`, so its name comes off the request.
    const nameByItem = new Map<string, string | undefined>(
      resolvedReservations.map((r) => [r.itemId, itemMap.get(r.itemId)?.name ?? r.name]),
    );
    const originalByItem = new Map(existingLoan.reservations.map((r) => [r.itemId, r.amount]));
    const newByItem = new Map(resolvedReservations.map((r) => [r.itemId, r.amount]));

    const addedItems: Array<{ itemId: string; name: string | undefined; amount: number }> = [];
    const changedItems: Array<{
      itemId: string;
      name: string | undefined;
      from: number;
      to: number;
    }> = [];
    const removedItems: Array<{ itemId: string; name: string | undefined; amount: number }> = [];
    // Per-item status changes (admin), for the audit trail. Only recorded when
    // the whole-loan status isn't being flattened over everything — in that
    // case the loan-level `status` change already says it all.
    const statusChanges: Array<{
      itemId: string;
      name: string | undefined;
      from: ReservationStatus;
      to: ReservationStatus;
    }> = [];

    for (const [itemId, newAmount] of newByItem.entries()) {
      if (!originalByItem.has(itemId)) {
        addedItems.push({ itemId, name: nameByItem.get(itemId), amount: newAmount });
      } else {
        const orig = originalByItem.get(itemId)!;
        if (orig !== newAmount) {
          changedItems.push({ itemId, name: nameByItem.get(itemId), from: orig, to: newAmount });
        }
      }
    }
    for (const [itemId, origAmount] of originalByItem.entries()) {
      if (!newByItem.has(itemId)) {
        removedItems.push({ itemId, name: itemMap.get(itemId)?.name, amount: origAmount });
      }
    }
    if (!manualStatus) {
      for (const r of resolvedReservations) {
        if (r.status === undefined) continue;
        const from = statusByItem.get(r.itemId);
        if (from !== undefined && from !== r.status) {
          statusChanges.push({
            itemId: r.itemId,
            name: nameByItem.get(r.itemId),
            from,
            to: r.status,
          });
        }
      }
    }

    // When an admin changes per-item statuses (and no whole-loan status was
    // set), the loan's stored status must follow the reservations — the same
    // derivation `loanReturned`/`loanProcessed` use — or a loan whose items
    // were individually moved to IN_BOX would keep reading INUSE. A whole-loan
    // manual status still wins and is flattened onto every line.
    const derivedFromItems =
      !manualStatus && statusChanges.length > 0
        ? deriveLoanStatus(
            reservationsWithStatus.map((r) => ({ status: r.status })),
            existingLoan.status,
          )
        : undefined;

    const data: Prisma.LoanUpdateInput = {
      reservations: {
        deleteMany: {},
        create: reservationsWithStatus,
      },
      startTime: startTime,
      endTime: endTime,
      description: description,
      // Only a loan sitting in a box keeps its box; any other manual status
      // means the kamat are no longer there, so the box is freed.
      ...(manualStatus
        ? {
            status: manualStatus,
            ...(manualStatus === LoanStatus.IN_BOX ? {} : { boxId: null }),
          }
        : {}),
      // A per-item status change re-derives the loan status; free the box when
      // nothing is left in it.
      ...(derivedFromItems
        ? {
            status: derivedFromItems,
            ...(derivedFromItems === LoanStatus.IN_BOX ? {} : { boxId: null }),
          }
        : {}),
      ...(newUserId ? { user: { connect: { id: newUserId } } } : {}),
      ...(newLoaner !== undefined ? { loaner: newLoaner } : {}),
    };

    const result = await prisma.loan.update({
      where: {
        id: id,
      },
      data,
    });

    // Record a date change (e.g. an admin extending an ongoing loan) so the
    // audit trail captures why the return date moved.
    const datesChanged =
      existingLoan.startTime.getTime() !== requestedStart.getTime() ||
      existingLoan.endTime.getTime() !== requestedEnd.getTime();
    const dates = datesChanged
      ? {
          startTime: { from: existingLoan.startTime, to: requestedStart },
          endTime: { from: existingLoan.endTime, to: requestedEnd },
        }
      : undefined;

    const statusChanged = manualStatus !== undefined && manualStatus !== existingLoan.status;

    const loanerChanged =
      (newUserId !== undefined && newUserId !== existingLoan.userId) ||
      (newLoaner !== undefined && newLoaner !== (existingLoan.loaner ?? ''));
    const loanerChange = loanerChanged
      ? {
          userId: { from: existingLoan.userId, to: newUserId ?? existingLoan.userId },
          loaner: {
            from: existingLoan.loaner ?? null,
            to: newLoaner ?? existingLoan.loaner ?? null,
          },
        }
      : undefined;

    await logLoanHistory({
      loanId: id,
      action: 'UPDATED',
      ...resolveLoanActor(session),
      details: {
        added: addedItems,
        changed: changedItems,
        removed: removedItems,
        ...(statusChanges.length > 0 ? { statusChanges } : {}),
        ...(dates ? { dates } : {}),
        ...(statusChanged ? { status: { from: existingLoan.status, to: manualStatus } } : {}),
        ...(loanerChange ? { loaner: loanerChange } : {}),
      },
    });

    // Dates, items and description all show in the event, so re-sync on any
    // edit rather than trying to work out whether this one mattered.
    syncLoanCalendarInBackground(id);

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof Error) {
      return NextResponse.json({ message: err.message }, { status: 500 });
    } else {
      return NextResponse.json({ message: 'Unknown error' }, { status: 500 });
    }
  }
}
