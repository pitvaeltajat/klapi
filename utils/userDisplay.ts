/**
 * What to call a person on screen.
 *
 * The rule, everywhere: their name, and the address only when no name is
 * recorded. An email reads like a mailbox rather than a person — and half the
 * kalusto knows each other by first name and nothing else — so it is the
 * fallback, never the label.
 *
 * `fallback` is what is left when a row has neither, which is rare but real:
 * an account provisioned from a Workspace roster entry with no display name,
 * or a history entry with no actor at all. Each caller phrases it for its own
 * screen ('Järjestelmä' in a history list, '-' in a table cell).
 */
export const displayName = (
  user: { name?: string | null; email?: string | null } | null | undefined,
  fallback = 'Tuntematon käyttäjä',
): string => user?.name?.trim() || user?.email?.trim() || fallback;
