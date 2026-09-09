import { ReservationStatus } from '@prisma/client';
import prisma from '@/utils/prisma';
import { activeItemsWhere } from '@/utils/itemQueries';
import { activeLoansWhere } from '@/utils/loanQueries';

/**
 * What is free, and why it isn't. **The one place availability is decided** —
 * the catalogue, the cart and `loan/updateLoan`'s guard all read from here, so
 * the browser can never be shown a number the save then disagrees with.
 *
 * A kama can be unavailable for two different reasons:
 *
 * 1. It is booked — some overlapping loan holds it.
 * 2. It is *inside* something that is booked. A sijainti may be a kama
 *    ("Sininen työkalupakki"), and lending the box lends what is in it: the
 *    hammer left the building in the box's boot and cannot be picked up
 *    separately. `blockedBy` names the box so the UI can say so.
 *
 * The cascade runs downwards only. Lending the hammer on its own does **not**
 * take the box off the shelf — the box goes out one hammer short, which is
 * exactly what the troop does in practice, and blocking it would make a full
 * toolbox unlendable the moment anyone borrowed a screwdriver from it.
 */
export interface ItemAvailability {
  available: number;
  /** The container kama whose loan is what makes this one unavailable. */
  blockedBy?: { id: string; name: string };
}

export interface AvailabilityRange {
  start: Date;
  end: Date;
}

export interface AvailabilityOptions {
  /**
   * Ignore this loan's own reservations. The edit page asks "what would fit
   * here" about a loan that is itself holding some of it — without this, a full
   * loan looks impossible to edit.
   */
  excludeLoanId?: string;
}

/** A returned or rejected line holds nothing; a line in the box is back. */
const BLOCKING_STATUSES = [
  ReservationStatus.ACCEPTED,
  ReservationStatus.INUSE,
] as const;

/** How deep a box-inside-a-box chain is followed before we stop looking. */
const MAX_NESTING = 10;

interface DayRange {
  start: Date;
  end: Date;
}

/** Local midnight to local end-of-day, one entry per day in the range. */
function daysIn({ start, end }: AvailabilityRange): DayRange[] {
  const days: DayRange[] = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setHours(23, 59, 59, 999);
  while (cursor <= last) {
    const dayStart = new Date(cursor);
    const dayEnd = new Date(cursor);
    dayEnd.setHours(23, 59, 59, 999);
    days.push({ start: dayStart, end: dayEnd });
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export async function computeAvailabilities(
  range: AvailabilityRange,
  { excludeLoanId }: AvailabilityOptions = {},
): Promise<Record<string, ItemAvailability>> {
  const [items, reservations] = await Promise.all([
    prisma.item.findMany({
      where: activeItemsWhere,
      select: {
        id: true,
        name: true,
        amount: true,
        locationId: true,
        asLocation: { select: { id: true } },
      },
    }),
    // Only the reservations that overlap the window are worth loading; the rest
    // can't affect any day in it.
    prisma.reservation.findMany({
      where: {
        status: { in: [...BLOCKING_STATUSES] },
        loan: {
          ...activeLoansWhere,
          ...(excludeLoanId ? { id: { not: excludeLoanId } } : {}),
          startTime: { lte: range.end },
          endTime: { gte: range.start },
        },
      },
      select: {
        itemId: true,
        amount: true,
        loan: { select: { startTime: true, endTime: true } },
      },
    }),
  ]);

  // A sijainti that is a kama points back at it; that is the edge the cascade
  // walks. Contents know their sijainti, so this maps that sijainti to the kama
  // it stands for.
  const itemByLocation = new Map<string, string>();
  for (const item of items) {
    if (item.asLocation) itemByLocation.set(item.asLocation.id, item.id);
  }

  const byId = new Map(items.map((i) => [i.id, i]));

  /** Every kama this one is inside, nearest first. */
  const containersAbove = (itemId: string): string[] => {
    const chain: string[] = [];
    const seen = new Set([itemId]);
    let current = byId.get(itemId);
    // A box put inside itself (however that happened) would loop forever, and a
    // chain this long is a data-entry accident rather than a real shelf.
    while (current?.locationId && chain.length < MAX_NESTING) {
      const containerId = itemByLocation.get(current.locationId);
      if (!containerId || seen.has(containerId)) break;
      chain.push(containerId);
      seen.add(containerId);
      current = byId.get(containerId);
    }
    return chain;
  };

  const reservedByItem = new Map<string, typeof reservations>();
  for (const reservation of reservations) {
    const list = reservedByItem.get(reservation.itemId);
    if (list) list.push(reservation);
    else reservedByItem.set(reservation.itemId, [reservation]);
  }

  const days = daysIn(range);
  const overlapsDay = (r: (typeof reservations)[number], day: DayRange) =>
    r.loan.startTime <= day.end && r.loan.endTime >= day.start;

  /** How many of this kama are booked on this day, ignoring any container. */
  const bookedOn = (itemId: string, day: DayRange): number =>
    (reservedByItem.get(itemId) ?? [])
      .filter((r) => overlapsDay(r, day))
      .reduce((sum, r) => sum + r.amount, 0);

  const availabilities: Record<string, ItemAvailability> = {};

  for (const item of items) {
    const containers = containersAbove(item.id);
    let lowest = item.amount;
    let blockedBy: ItemAvailability['blockedBy'];

    for (const day of days) {
      // Any part of the box being out takes the whole of what is inside it: the
      // contents left with it, however many of the box there nominally are.
      const heldContainer = containers.find((id) => bookedOn(id, day) > 0);
      const free = heldContainer ? 0 : item.amount - bookedOn(item.id, day);
      if (heldContainer && !blockedBy) {
        const container = byId.get(heldContainer);
        if (container) blockedBy = { id: container.id, name: container.name };
      }
      if (free < lowest) lowest = free;
    }

    availabilities[item.id] = {
      available: Math.max(0, lowest),
      ...(blockedBy && lowest <= 0 ? { blockedBy } : {}),
    };
  }

  return availabilities;
}
