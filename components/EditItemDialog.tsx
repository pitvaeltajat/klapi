'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { toast } from 'sonner';
import type { Category, Location } from '@prisma/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field } from '@/components/ui/field';
import { NumberInput } from '@/components/ui/number-input';
import { CreatableSelect } from '@/components/ui/creatable-select';
import { ApiError, readJson } from '@/utils/apiError';
import { useItemOriginalImage, usePlaceholder } from '@/hooks/useItemImage';
import { cn } from '@/lib/utils';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface SelectOption {
  value: string;
  label: string;
}

export interface EditableItem {
  id: string;
  name: string;
  description: string | null;
  amount: number;
  categories: Category[];
  location: { id: string; name: string } | null;
}

interface EditItemDialogProps {
  item: EditableItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful save, before the dialog closes. */
  onSaved?: () => void;
}

/**
 * Edits a kama in place. This used to be its own `/admin/edititem/[id]` route,
 * which meant leaving the page you were looking at (and coming back to the top
 * of it) to change one field.
 *
 * Mount this only while it is open (see ItemView) — the form state seeds from
 * `item` on mount, so an abandoned draft can never reappear on reopen and no
 * syncing effect is needed.
 */
export default function EditItemDialog({ item, open, onOpenChange, onSaved }: EditItemDialogProps) {
  const router = useRouter();
  const existingImageSrc = useItemOriginalImage(item.id);
  const placeholder = usePlaceholder();

  // Only an admin can open this, and both endpoints are admin-only — fetch
  // them lazily so a plain item page never pays for the requests.
  const { data: categories = [] } = useSWR<Category[]>(
    open ? '/api/category/getCategories' : null,
    fetcher,
  );
  const { data: locations = [] } = useSWR<Location[]>(
    open ? '/api/location/getLocations' : null,
    fetcher,
  );

  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description);
  const [amount, setAmount] = useState(item.amount);
  const [itemCategories, setItemCategories] = useState(item.categories);
  const [location, setLocation] = useState<SelectOption | null>(
    item.location ? { value: item.location.id, label: item.location.name } : null,
  );
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Blob URLs for the local preview are ours to release.
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setImage(file);
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  };

  const submitImage = async (file: File) => {
    const response = await fetch('/api/item/uploadImage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: item.id, contentType: file.type }),
    });
    if (!response.ok) throw new Error('Kuvan lataus epäonnistui');
    const { url, fields } = await response.json();
    const formData = new FormData();
    Object.entries(fields).forEach(([key, value]) => formData.append(key, value as string));
    formData.append('file', file);
    const upload = await fetch(url, { method: 'POST', body: formData });
    if (!upload.ok) throw new Error('Kuvan tallennus epäonnistui');
  };

  const updateItem = async () => {
    if (!name.trim()) {
      toast.error('Nimi on pakollinen');
      return;
    }
    setIsSubmitting(true);
    try {
      if (image) await submitImage(image);

      const response = await fetch('/api/item/editItem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          name: name.trim(),
          description,
          amount,
          categories: itemCategories,
          // `null` clears the sijainti; an option the admin typed rather than
          // picked carries its own label as `value`, which the route turns
          // into a new Location (same contract as createItem).
          locationId: location,
        }),
      });
      await readJson(response, 'Virhe kaman päivityksessä');

      toast.success('Kama päivitetty');
      onSaved?.();
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Virhe kaman päivityksessä', {
        description: err instanceof ApiError ? err.detail : undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // A warning outline marks the fields that differ from what is stored, so it
  // is obvious what this save will change.
  const dirty = (isDirty: boolean) => (isDirty ? 'border-2 border-warning' : '');

  return (
    <Dialog open={open} onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Muokkaa kamaa</DialogTitle>
          <DialogDescription>
            Muutetut kentät on korostettu. Tallennus päivittää kaman heti.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field label="Nimi" required htmlFor="edit-item-name">
            <Input
              id="edit-item-name"
              placeholder="Mäkihyppylehti"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={cn(dirty(name !== item.name))}
            />
          </Field>

          <Field label="Kuvaus" htmlFor="edit-item-description">
            <Textarea
              id="edit-item-description"
              placeholder="Viihteeksi reissuille kaluston vessaan."
              value={description || ''}
              onChange={(e) => setDescription(e.target.value)}
              className={cn(dirty(description !== item.description))}
            />
          </Field>

          <Field label="Määrä" htmlFor="edit-item-amount">
            <NumberInput id="edit-item-amount" min={1} value={amount} onChange={setAmount} />
          </Field>

          <Field label="Kategoriat" htmlFor="edit-item-categories">
            <CreatableSelect
              inputId="edit-item-categories"
              isMulti
              value={itemCategories.map((cat) => ({ value: cat.id, label: cat.name }))}
              options={categories.map((cat) => ({ value: cat.id, label: cat.name }))}
              onChange={(e) =>
                setItemCategories(
                  (e as { value: string; label: string }[]).map((cat) => ({
                    name: cat.label,
                    id: cat.value,
                    description: null,
                  })),
                )
              }
            />
          </Field>

          <Field label="Sijainti" htmlFor="edit-item-location">
            <CreatableSelect
              inputId="edit-item-location"
              placeholder="Kolon vessa"
              value={location}
              options={locations.map((loc) => ({ value: loc.id, label: loc.name }))}
              onChange={(option) => setLocation(option as SelectOption | null)}
              isClearable
            />
          </Field>

          <Field label="Kuva" htmlFor="edit-item-image">
            {/* eslint-disable-next-line @next/next/no-img-element -- blob preview / dynamic S3 URL with onError fallback */}
            <img
              src={preview ?? (imgError ? placeholder : existingImageSrc)}
              alt={item.name}
              onError={() => setImgError(true)}
              className="mb-2 max-h-[220px] max-w-full rounded-md object-contain"
            />
            <Input
              id="edit-item-image"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
            />
          </Field>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Peruuta
          </Button>
          <Button variant="success" onClick={updateItem} isLoading={isSubmitting}>
            Tallenna
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
