'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR, { mutate } from 'swr';
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

interface SelectOption {
  value: string;
  label: string;
}

interface AddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful create, before the dialog closes. */
  onCreated?: () => void;
}

const emptyDraft = {
  name: '',
  description: '',
  amount: 1,
  categories: [] as SelectOption[],
  location: null as SelectOption | null,
};

/**
 * Creates a kama. This used to be its own `/admin/createItem` route (and, in
 * the inventory table, a half-a-form inline row) — same story as
 * `EditItemDialog`: you had to leave the list you were looking at to add one
 * thing to it.
 *
 * Mount this only while it is open so the draft always starts empty; the one
 * exception is "Luo ja lisää toinen", which resets the fields in place and
 * keeps the dialog open for the next kama.
 */
export default function AddItemDialog({ open, onOpenChange, onCreated }: AddItemDialogProps) {
  const router = useRouter();

  // Both option lists are admin-only endpoints — fetch them only while the
  // dialog is actually open.
  const { data: categories = [] } = useSWR<Category[]>(
    open ? '/api/category/getCategories' : null,
  );
  const { data: locations = [] } = useSWR<Location[]>(open ? '/api/location/getLocations' : null);

  const [name, setName] = useState(emptyDraft.name);
  const [description, setDescription] = useState(emptyDraft.description);
  const [amount, setAmount] = useState(emptyDraft.amount);
  const [selectedCategories, setSelectedCategories] = useState<SelectOption[]>(
    emptyDraft.categories,
  );
  const [selectedLocation, setSelectedLocation] = useState<SelectOption | null>(
    emptyDraft.location,
  );
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<'close' | 'another' | null>(null);

  // Blob URLs for the local preview are ours to release.
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const resetForm = () => {
    setName(emptyDraft.name);
    setDescription(emptyDraft.description);
    setAmount(emptyDraft.amount);
    setSelectedCategories(emptyDraft.categories);
    setSelectedLocation(emptyDraft.location);
    setImage(null);
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setImage(file);
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  };

  const submitImage = async (itemId: string, file: File) => {
    const response = await fetch('/api/item/uploadImage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: itemId, contentType: file.type }),
    });
    if (!response.ok) throw new Error('Kuvan lataus epäonnistui');
    const { url, fields } = await response.json();
    const formData = new FormData();
    Object.entries(fields).forEach(([key, value]) => formData.append(key, value as string));
    formData.append('file', file);
    const upload = await fetch(url, { method: 'POST', body: formData });
    if (!upload.ok) throw new Error('Kuvan tallennus epäonnistui');
  };

  const createItem = async (after: 'close' | 'another') => {
    if (!name.trim()) {
      toast.error('Nimi on pakollinen');
      return;
    }
    setSubmitting(after);
    try {
      const response = await fetch('/api/item/createItem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          amount,
          type: 'normal',
          categories: selectedCategories,
          locationId: selectedLocation,
        }),
      });
      const created = await readJson<{ id: string }>(response, 'Virhe kaman luonnissa');

      // The kama itself exists at this point, so a failed upload is a warning,
      // not a failed create — the image can be added from the edit dialog.
      if (image) {
        try {
          await submitImage(created.id, image);
        } catch (uploadErr) {
          toast.warning('Kama luotu, mutta kuvan lataus epäonnistui', {
            description: uploadErr instanceof Error ? uploadErr.message : undefined,
          });
        }
      }

      toast.success('Kama luotu', { description: `"${name.trim()}" luotu onnistuneesti` });
      onCreated?.();
      // The inventory table pages/filters/sorts server-side, so its SWR key
      // varies — revalidate every cached page of it rather than one URL.
      void mutate((key) => typeof key === 'string' && key.startsWith('/api/item/getInventory'));
      router.refresh();
      resetForm();
      if (after === 'close') onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Virhe kaman luonnissa', {
        description: err instanceof ApiError ? err.detail : undefined,
      });
    } finally {
      setSubmitting(null);
    }
  };

  const isSubmitting = submitting !== null;

  return (
    <Dialog open={open} onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Luo uusi kama</DialogTitle>
          <DialogDescription>
            Vain nimi on pakollinen — muut kentät voi täyttää myöhemmin muokkaamalla kamaa.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field label="Nimi" required htmlFor="add-item-name">
            <Input
              id="add-item-name"
              placeholder="PJ-teltta"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>

          <Field label="Määrä" required htmlFor="add-item-amount">
            <NumberInput id="add-item-amount" min={1} value={amount} onChange={setAmount} />
          </Field>

          <Field label="Kuvaus" htmlFor="add-item-description">
            <Textarea
              id="add-item-description"
              placeholder="Kamaa käytetään…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>

          <Field label="Kategoriat" htmlFor="add-item-categories">
            <CreatableSelect
              inputId="add-item-categories"
              isMulti
              placeholder="Retkikeittimet"
              value={selectedCategories}
              options={categories.map((cat) => ({ value: cat.id, label: cat.name }))}
              onChange={(option) => setSelectedCategories([...(option as SelectOption[])])}
              isClearable
              backspaceRemovesValue
            />
          </Field>

          <Field label="Sijainti" htmlFor="add-item-location">
            <CreatableSelect
              inputId="add-item-location"
              placeholder="Kolon vessa"
              value={selectedLocation}
              options={locations.map((loc) => ({ value: loc.id, label: loc.name }))}
              onChange={(option) => setSelectedLocation(option as SelectOption | null)}
              isClearable
            />
          </Field>

          <Field label="Kuva" htmlFor="add-item-image">
            {preview && (
              /* eslint-disable-next-line @next/next/no-img-element -- local blob preview */
              <img
                src={preview}
                alt="Esikatselu"
                className="mb-2 max-h-[220px] max-w-full rounded-md object-contain"
              />
            )}
            <Input
              id="add-item-image"
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
          <Button
            variant="outline"
            onClick={() => createItem('another')}
            isLoading={submitting === 'another'}
            disabled={isSubmitting}
          >
            Luo ja lisää toinen
          </Button>
          <Button
            variant="success"
            onClick={() => createItem('close')}
            isLoading={submitting === 'close'}
            disabled={isSubmitting}
          >
            Luo kama
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
