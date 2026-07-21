/**
 * Tab-scoped persistence for the cart + dates contexts.
 *
 * Both live in memory only, so an accidental reload (or a browser tab restore
 * on the kiosk) used to wipe a half-built loan. We stash them in
 * `sessionStorage` — per tab, cleared when the tab closes — behind a timestamp
 * so a stale basket never comes back to life. On the shared kiosk that TTL is
 * the whole safety story: state older than it belonged to whoever stood there
 * before you, and must not be restored.
 */

const TTL_MS = 30 * 60 * 1000;

interface Envelope<T> {
  savedAt: number;
  value: T;
}

/**
 * Read back a value written by {@link savePersisted}, or null when there is
 * nothing stored, the entry has aged out, or the payload is unreadable
 * (storage disabled, quota games, a shape from an older release).
 */
export function loadPersisted<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Envelope<T>;
    if (typeof parsed?.savedAt !== 'number' || Date.now() - parsed.savedAt > TTL_MS) {
      window.sessionStorage.removeItem(key);
      return null;
    }
    return parsed.value;
  } catch {
    return null;
  }
}

/** Persist `value` under `key`, stamped with the current time. Best-effort. */
export function savePersisted<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    const envelope: Envelope<T> = { savedAt: Date.now(), value };
    window.sessionStorage.setItem(key, JSON.stringify(envelope));
  } catch {
    // Storage full or blocked — persistence is a convenience, never load-bearing.
  }
}

export const CART_STORAGE_KEY = 'klapi.cart';
export const DATES_STORAGE_KEY = 'klapi.dates';
