import { NextResponse } from 'next/server';

/**
 * Server half of the route error contract (the client half is
 * `utils/apiError.ts`). Both helpers answer with `{ message, detail? }`, the
 * same shape `requireAdmin` already uses for its 401.
 */

/** A refused request: the caller sent something we can name. */
export function badRequest(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

/**
 * An unexpected failure. Logs the whole error and returns the last line of it
 * as `detail` — Prisma writes a multi-line diagram of the offending query and
 * puts the actual complaint at the end, and that last line is the only part
 * worth putting in a toast.
 *
 * Only use this on admin-gated routes: `detail` leaks query shape.
 */
export function failed(message: string, err: unknown, context: string) {
  console.error(`${context} failed`, err);
  const raw = err instanceof Error ? err.message : String(err);
  const detail = raw.split('\n').filter((line) => line.trim()).pop();
  return NextResponse.json({ message, detail }, { status: 500 });
}
