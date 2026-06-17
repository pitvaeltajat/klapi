'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { LoanStatus, ReservationStatus } from '@prisma/client';
import { cn } from '@/lib/utils';
import { formatDateOnly, formatDateShortWeekday } from '@/utils/dateFormat';

interface TimelineReservation {
  id: string;
  amount: number;
  status: ReservationStatus;
  loan: {
    id: string;
    description: string | null;
    status: LoanStatus;
    startTime: Date | string;
    endTime: Date | string;
    userId: string;
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_RANGE_DAYS = 14; // always show at least a fortnight so the axis reads
const LANE_HEIGHT = 36; // px per stacked row of bars

// A reservation occupies the item only while it's accepted or in use. Returned /
// boxed / rejected lines no longer block — mirrors the availability endpoint.
function blocksAvailability(status: ReservationStatus): boolean {
  return (
    status !== 'REJECTED' && status !== 'RETURNED' && status !== 'IN_BOX'
  );
}

/**
 * Horizontal Gantt-style view of an item's current and upcoming bookings.
 * Answers "is this free the weekend I need it?" at a glance. Booking dates +
 * quantities are already public via ReservationTable, so this renders for every
 * viewer; admins additionally get a click-through to each loan.
 */
export default function BookingTimeline({
  reservations,
  totalAmount,
  isAdmin = false,
}: {
  reservations: TimelineReservation[];
  totalAmount: number;
  isAdmin?: boolean;
}) {
  // Capture "now" once on mount — reading the clock during render is impure
  // (react-hooks/purity) and would also drift the layout on every re-render.
  const [nowMs] = useState(() => Date.now());

  const { lanes, laneCount, rangeStart, rangeMs, ticks } = useMemo(() => {
    const start = new Date(nowMs);
    start.setHours(0, 0, 0, 0);

    // Current + future bookings that still hold stock.
    const upcoming = reservations
      .filter(
        (r) =>
          blocksAvailability(r.status) &&
          new Date(r.loan.endTime).getTime() >= start.getTime(),
      )
      .sort(
        (a, b) =>
          new Date(a.loan.startTime).getTime() - new Date(b.loan.startTime).getTime(),
      );

    const latestEnd = upcoming.reduce(
      (max, r) => Math.max(max, new Date(r.loan.endTime).getTime()),
      start.getTime(),
    );
    const end = new Date(
      Math.max(latestEnd + DAY_MS, start.getTime() + MIN_RANGE_DAYS * DAY_MS),
    );
    const totalMs = end.getTime() - start.getTime();

    // Greedy lane packing: drop each booking into the first lane it doesn't
    // overlap, so concurrent bookings stack instead of colliding.
    const laneEnds: number[] = [];
    const packed: { res: TimelineReservation; lane: number }[] = [];
    for (const res of upcoming) {
      const s = new Date(res.loan.startTime).getTime();
      const e = new Date(res.loan.endTime).getTime();
      let lane = laneEnds.findIndex((laneEnd) => laneEnd <= s);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(e);
      } else {
        laneEnds[lane] = e;
      }
      packed.push({ res, lane });
    }

    // ~5 evenly spaced date ticks across the range.
    const tickCount = 5;
    const tickList = Array.from({ length: tickCount }, (_, i) => {
      const fraction = i / (tickCount - 1);
      return { fraction, date: new Date(start.getTime() + fraction * totalMs) };
    });

    return {
      lanes: packed,
      laneCount: laneEnds.length,
      rangeStart: start,
      rangeMs: totalMs,
      ticks: tickList,
    };
  }, [reservations, nowMs]);

  if (lanes.length === 0) {
    return (
      <section className="mt-4">
        <h2 className="mb-2 text-xl font-semibold">Tulevat varaukset</h2>
        <p className="text-sm text-muted-foreground">Ei tulevia varauksia.</p>
      </section>
    );
  }

  const startMs = rangeStart.getTime();

  return (
    <section className="mt-4">
      <h2 className="mb-3 text-xl font-semibold">Tulevat varaukset</h2>
      <div className="rounded-lg border bg-card p-4 shadow-xs">
        <div
          className="relative w-full"
          style={{ height: laneCount * LANE_HEIGHT }}
        >
          {lanes.map(({ res, lane }) => {
            const s = new Date(res.loan.startTime).getTime();
            const e = new Date(res.loan.endTime).getTime();
            const clampedStart = Math.max(s, startMs);
            const clampedEnd = Math.min(e, startMs + rangeMs);
            const left = ((clampedStart - startMs) / rangeMs) * 100;
            const width = Math.max(((clampedEnd - clampedStart) / rangeMs) * 100, 2);
            const ongoing = s <= nowMs && e >= nowMs;

            const title = `${formatDateOnly(res.loan.startTime)} – ${formatDateOnly(
              res.loan.endTime,
            )} · ${res.amount}/${totalAmount} kpl${
              isAdmin && res.loan.description ? ` · ${res.loan.description}` : ''
            }`;

            const bar = (
              <div
                title={title}
                className={cn(
                  'absolute flex items-center overflow-hidden rounded-md border px-2 text-xs font-medium',
                  ongoing
                    ? 'border-warning/50 bg-warning/20 text-foreground'
                    : 'border-primary/40 bg-primary/15 text-foreground',
                  isAdmin && 'cursor-pointer hover:brightness-95',
                )}
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  top: lane * LANE_HEIGHT,
                  height: LANE_HEIGHT - 8,
                }}
              >
                <span className="truncate">{res.amount} kpl</span>
              </div>
            );

            return isAdmin ? (
              <Link key={res.id} href={`/loan/${res.loan.id}`} className="contents">
                {bar}
              </Link>
            ) : (
              <React.Fragment key={res.id}>{bar}</React.Fragment>
            );
          })}
        </div>

        {/* date axis */}
        <div className="relative mt-1 h-4 border-t">
          {ticks.map(({ fraction, date }, i) => (
            <span
              key={i}
              className={cn(
                'absolute top-1 text-[10px] text-muted-foreground',
                i === 0 && 'left-0',
                i === ticks.length - 1 && '-translate-x-full',
                i !== 0 && i !== ticks.length - 1 && '-translate-x-1/2',
              )}
              style={
                i === ticks.length - 1
                  ? { left: '100%' }
                  : { left: `${fraction * 100}%` }
              }
            >
              {formatDateShortWeekday(date)}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
