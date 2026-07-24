/**
 * Client half of the route error contract (the server half is
 * `utils/apiResponse.ts`).
 *
 * Routes answer a failure with `{ message, detail? }`: `message` is the Finnish
 * headline, `detail` the underlying reason when there is one worth showing.
 * Dialogs used to throw a hard-coded string on `!response.ok`, so every failure
 * — a 401, a validation error, a Prisma complaint — surfaced as the same
 * unhelpful toast and the real cause stayed in the server log.
 *
 * Usage:
 *
 *   const created = await readJson<{ id: string }>(response, 'Virhe kaman luonnissa');
 *   …
 *   catch (err) {
 *     toast.error(err instanceof Error ? err.message : fallback, {
 *       description: err instanceof ApiError ? err.detail : undefined,
 *     });
 *   }
 */
export class ApiError extends Error {
  detail?: string;
  status: number;

  constructor(message: string, detail: string | undefined, status: number) {
    super(message);
    this.name = 'ApiError';
    this.detail = detail;
    this.status = status;
  }
}

interface ErrorBody {
  message?: string;
  detail?: string;
}

/**
 * Parses a route response, throwing `ApiError` when it failed. `fallback` is
 * the message to use if the route sent no body (a crash before the handler, or
 * a proxy error page).
 */
export async function readJson<T>(response: Response, fallback: string): Promise<T> {
  const payload = (await response.json().catch(() => null)) as (T & ErrorBody) | null;
  if (!response.ok) {
    throw new ApiError(payload?.message ?? fallback, payload?.detail, response.status);
  }
  return payload as T;
}
