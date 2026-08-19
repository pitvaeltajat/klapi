'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field } from '@/components/ui/field';
import { NumberInput } from '@/components/ui/number-input';
import { CreatableSelect } from '@/components/ui/creatable-select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ApiError, readJson } from '@/utils/apiError';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface SelectOption {
  value: string;
  label: string;
}

interface NamedRow {
  id: string;
  name: string;
  description: string | null;
}

/** Everything the form needs to seed from — an item page and an inventory row
 *  both satisfy this. */
export interface PromotableItem {
  id: string;
  name: string;
  description: string | null;
  amount: number;
  categories: { id: string; name: string }[];
  location: { id: string; name: string } | null;
}

/** What `promoteItem` answers with: the row as it now stands. */
export interface PromotedItem {
  id: string;
  name: string;
  description: string | null;
  amount: number;
  locationId: string | null;
  type: 'normal' | 'temporary';
  deletedAt: string | null;
  location: NamedRow | null;
  categories: NamedRow[];
}

interface Props {
  item: PromotableItem;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (updated: PromotedItem) => void;
}

/**
 * "Siirrä kirjastoon" — turns a väliaikainen kama (the one-off a loaner typed
 * into their own basket) into a catalogue item everyone can borrow. Promotion
 * is the moment the troop decides to keep the thing, so the form is a last
 * chance to fix the name and fill in the sijainti/kategoriat the loaner never
 * had to give.
 *
 * Mount it only while it is open — the form seeds from `item` on mount, so an
 * abandoned draft can never reappear. The kategoria and sijainti lists are
 * fetched here rather than passed in; SWR shares the cache with whatever page
 * already loaded them, so this costs nothing on the inventory screen.
 */
export default function PromoteItemDialog({ item, onOpenChange, onSuccess }: Props) {
  const { data: categories = [] } = useSWR<NamedRow[]>('/api/category/getCategories', fetcher);
  const { data: locations = [] } = useSWR<NamedRow[]>('/api/location/getLocations', fetcher);

  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description ?? '');
  const [amount, setAmount] = useState(item.amount);
  const [selectedCategories, setSelectedCategories] = useState<SelectOption[]>(
    item.categories.map((c) => ({ value: c.id, label: c.name })),
  );
  const [selectedLocation, setSelectedLocation] = useState<SelectOption | null>(
    item.location ? { value: item.location.id, label: item.location.name } : null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!name.trim()) {
      toast.error('Nimi on pakollinen');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/item/promoteItem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          name: name.trim(),
          description: description || null,
          amount,
          categories: selectedCategories.map((c) => ({ id: c.value, name: c.label })),
          // `{ value, label }`, the same sijainti contract createItem/editItem
          // take — a sijainti the admin typed here gets created.
          locationId: selectedLocation,
        }),
      });
      const updated = await readJson<PromotedItem>(res, 'Siirto epäonnistui');
      toast.success('Kama siirretty kirjastoon');
      onSuccess?.(updated);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Siirto epäonnistui', {
        description: err instanceof ApiError ? err.detail : undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Siirrä kirjastoon</DialogTitle>
          <DialogDescription>
            Kamasta tulee pysyvä osa kalustoa. Täydennä tai korjaa tiedot ennen siirtoa.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field label="Nimi" required htmlFor="promote-item-name">
            <Input
              id="promote-item-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Kaman nimi"
            />
          </Field>

          <Field label="Kuvaus" htmlFor="promote-item-description">
            <Textarea
              id="promote-item-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Lyhyt kuvaus..."
            />
          </Field>

          <Field label="Määrä" htmlFor="promote-item-amount">
            <NumberInput id="promote-item-amount" min={1} value={amount} onChange={setAmount} />
          </Field>

          <Field label="Kategoriat" htmlFor="promote-item-categories">
            <CreatableSelect
              inputId="promote-item-categories"
              isMulti
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
              value={selectedCategories}
              onChange={(opts) => setSelectedCategories([...(opts as SelectOption[])])}
              placeholder="Valitse tai luo kategorioita"
            />
          </Field>

          <Field label="Sijainti" htmlFor="promote-item-location">
            <CreatableSelect
              inputId="promote-item-location"
              options={locations.map((l) => ({ value: l.id, label: l.name }))}
              value={selectedLocation}
              onChange={(opt) => setSelectedLocation(opt as SelectOption | null)}
              isClearable
              placeholder="Valitse tai luo sijainti"
            />
          </Field>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Peruuta
          </Button>
          <Button variant="success" onClick={handleConfirm} isLoading={isSubmitting}>
            Siirrä kirjastoon
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
