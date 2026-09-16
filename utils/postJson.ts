import { toast } from 'sonner';

/**
 * POST a JSON body from an admin page. A refused request toasts the route's
 * Finnish `message` and throws, so a caller only handles success — and an
 * `InlineEdit.onSave` stays open on failure without doing anything itself.
 */
export async function postJson<T = unknown>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    toast.error(data.message || 'Tallennus epäonnistui');
    throw new Error(data.message);
  }
  return data as T;
}
