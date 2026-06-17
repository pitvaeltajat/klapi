'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import NotAuthenticated from '@/components/NotAuthenticated';
import Breadcrumbs from '@/components/Breadcrumbs';
import type { Category, Location } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { NumberInput } from '@/components/ui/number-input';
import { CreatableSelect } from '@/components/ui/creatable-select';
import { Skeleton } from '@/components/ui/skeleton';

interface SelectOption {
  value: string;
  label: string;
}

interface LocationWithLabel extends Location {
  label: string;
  value: string;
}

interface CategoryWithLabel extends Category {
  label: string;
  value: string;
}

export default function CreateItemPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const { data: locations, error: locationsError } = useSWR<LocationWithLabel[]>(
    '/api/location/getLocations',
  );
  const { data: categories, error: categoriesError } = useSWR<CategoryWithLabel[]>(
    '/api/category/getCategories',
  );

  const [name, setName] = useState('');
  const [amount, setAmount] = useState(1);
  const [description, setDescription] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<SelectOption[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<SelectOption | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitAction, setSubmitAction] = useState<'redirect' | 'createAnother'>('redirect');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setImage(file);
    if (file) setPreviewUrl(URL.createObjectURL(file));
    else setPreviewUrl(null);
  };

  const resetForm = () => {
    setName('');
    setAmount(1);
    setDescription('');
    setSelectedCategories([]);
    setSelectedLocation(null);
    setImage(null);
    setPreviewUrl(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const values = {
        name,
        amount,
        description,
        categories: selectedCategories,
        locationId: selectedLocation,
      };

      const createResp = await fetch('/api/item/createItem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!createResp.ok) throw new Error('Failed to create item');

      const created = await createResp.json();
      const itemId = created.id;

      if (image) {
        const uploadResp = await fetch('/api/item/uploadImage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: itemId, contentType: image.type }),
        });

        if (uploadResp.ok) {
          const { url, fields } = await uploadResp.json();
          const formData = new FormData();
          Object.entries(fields).forEach(([key, value]) => {
            formData.append(key, value as string);
          });
          formData.append('file', image);

          await fetch(url, { method: 'POST', body: formData });

          await fetch('/api/item/editItem', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: itemId,
              name,
              description,
              amount,
              categories: selectedCategories.map((c) => ({ id: c.value, name: c.label })),
            }),
          });
        }
      }

      toast.success('Kama luotu', { description: `"${name}" luotu onnistuneesti` });
      resetForm();
      if (submitAction === 'redirect') router.push('/admin');
    } catch (error) {
      if (error instanceof Error) {
        toast.error('Error', { description: error.message });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (session?.user?.group !== 'ADMIN') return <NotAuthenticated />;
  if (locationsError || categoriesError) return <div>failed to load</div>;
  if (!categories || !locations)
    return (
      <>
        <Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: 'Luo uusi kama' }]} />
        <Skeleton className="mb-6 h-10 w-64" />
        <div className="flex flex-col gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </>
    );

  const locationOptions = locations.map((l) => ({ ...l, label: l.name, value: l.id }));
  const categoryOptions = categories.map((c) => ({ ...c, label: c.name, value: c.id }));

  return (
    <>
      <Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: 'Luo uusi kama' }]} />
      <h1 className="mb-6 text-3xl font-semibold">Luo uusi kama</h1>

      <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-4">
        <div>
          <Label htmlFor="name">
            Nimi <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            placeholder="PJ-teltta"
            value={name}
            required
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="amount">
            Määrä <span className="text-destructive">*</span>
          </Label>
          <NumberInput id="amount" min={1} value={amount} onChange={setAmount} />
        </div>

        <div>
          <Label htmlFor="description">Kuvaus</Label>
          <Textarea
            id="description"
            placeholder="Kamaa käytetään..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="categories">Kategoriat</Label>
          <CreatableSelect
            inputId="categories"
            isMulti
            options={categoryOptions}
            name="categories"
            placeholder="Retkikeittimet"
            value={selectedCategories}
            onChange={(option) => setSelectedCategories([...(option as SelectOption[])])}
            isClearable
            backspaceRemovesValue
          />
        </div>

        <div>
          <Label htmlFor="locationId">
            Sijainti <span className="text-destructive">*</span>
          </Label>
          <CreatableSelect
            options={locationOptions}
            inputId="locationId"
            name="locationId"
            placeholder="Kolon vessa"
            value={selectedLocation}
            onChange={(option) => setSelectedLocation(option as SelectOption | null)}
            isClearable
          />
        </div>

        <div className="mt-4">
          <Label htmlFor="image">Kuva</Label>
          <Input id="image" type="file" accept="image/*" onChange={handleImageChange} />
          {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
          {previewUrl && <img src={previewUrl} alt="Preview" className="mt-2 max-w-[300px]" />}
        </div>

        <div className="mt-4 flex gap-2">
          <Button
            variant="success"
            type="submit"
            isLoading={isSubmitting && submitAction === 'redirect'}
            onClick={() => setSubmitAction('redirect')}
          >
            Luo kama
          </Button>
          <Button
            variant="outline"
            type="submit"
            isLoading={isSubmitting && submitAction === 'createAnother'}
            onClick={() => setSubmitAction('createAnother')}
          >
            Luo ja lisää toinen
          </Button>
        </div>
      </form>
    </>
  );
}
