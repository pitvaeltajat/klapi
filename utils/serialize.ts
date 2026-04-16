/**
 * Serialize data by converting Dates to ISO strings (for passing
 * Prisma results from Server Components to Client Components).
 */
export function serialize<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}
