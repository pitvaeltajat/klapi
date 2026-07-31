/**
 * "Omat kamat" — the one-off items a loaner types into their own basket for
 * gear the catalogue doesn't have. They live in the cart under a
 * client-generated id and only become real `Item` rows (`type: temporary`) when
 * the loan is submitted.
 *
 * The id is minted in the browser rather than by the database so the optional
 * photo can be uploaded to S3 under that same key *before* the row exists;
 * submitLoan then creates the item with this exact id and the picture lines up
 * with no copying. A v4 UUID keeps the key unguessable, which is what lets a
 * non-admin be trusted with a presigned upload for it.
 */

const PREFIX = 'custom-';

const CUSTOM_ID_RE =
  /^custom-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function newCustomItemId(): string {
  return `${PREFIX}${crypto.randomUUID()}`;
}

/** Anything the cart treats as a custom item, including ids from older releases. */
export function isCustomItemId(id: string): boolean {
  return id.startsWith(PREFIX);
}

/**
 * Whether an id may be used as an S3 key and as an explicit `Item.id`. Stricter
 * than {@link isCustomItemId} on purpose: only the UUID shape is accepted, so a
 * caller can't presign an upload over a catalogue item's photo or hand-pick the
 * primary key of the row submitLoan is about to create.
 */
export function isUploadableCustomItemId(id: unknown): id is string {
  return typeof id === 'string' && CUSTOM_ID_RE.test(id);
}
