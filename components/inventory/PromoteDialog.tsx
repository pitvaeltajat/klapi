'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { NumberInput } from '@/components/ui/number-input';
import { CreatableSelect } from '@/components/ui/creatable-select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { InventoryItem, InventoryCategory, InventoryLocation } from './InventoryView';

interface SelectOption {
  value: string;
  label: string;
}

interface Props {
  item: InventoryItem;
  categories: InventoryCategory[];
  locations: InventoryLocation[];
  onOpenChange: (open: boolean) => void;
  onSuccess: (updated: InventoryItem) => void;
}

export default function PromoteDialog({
  item,
  categories,
  locations,
  onOpenChange,
  onSuccess,
}: Props) {
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

  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));
  const locationOptions = locations.map((l) => ({ value: l.id, label: l.name }));

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
          locationId: selectedLocation?.value ?? null,
        }),
      });
      if (!res.ok) {
        const data = await res.json() as { message?: string };
        throw new Error(data.message ?? 'Virhe');
      }
      const updated = await res.json() as InventoryItem;
      toast.success('Kama siirretty kirjastoon');
      onSuccess(updated);
      onOpenChange(false);
    } catch (err) {
      toast.error('Virhe', {
        description: err instanceof Error ? err.message : 'Siirto epäonnistui',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Siirrä kirjastoon</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Täydennä tai korjaa tiedot ennen siirtoa kirjastoon.
        </p>
        <div className="flex flex-col gap-4">
          <div>
            <Label>
              Nimi <span className="text-destructive">*</span>
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Kaman nimi"
            />
          </div>
          <div>
            <Label>Kuvaus</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Lyhyt kuvaus..."
            />
          </div>
          <div>
            <Label>Määrä</Label>
            <NumberInput min={1} value={amount} onChange={setAmount} />
          </div>
          <div>
            <Label>Kategoriat</Label>
            <CreatableSelect
              isMulti
              options={categoryOptions}
              value={selectedCategories}
              onChange={(opts) => setSelectedCategories([...(opts as SelectOption[])])}
              placeholder="Valitse tai luo kategorioita"
            />
          </div>
          <div>
            <Label>Sijainti</Label>
            <CreatableSelect
              options={locationOptions}
              value={selectedLocation}
              onChange={(opt) => setSelectedLocation(opt as SelectOption | null)}
              isClearable
              placeholder="Valitse tai luo sijainti"
            />
          </div>
        </div>
        <DialogFooter>
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
