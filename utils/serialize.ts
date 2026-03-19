/**
 * Serialize data for getServerSideProps by converting Dates to ISO strings.
 * Replaces the need for superjson.
 */
export function serialize<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}
