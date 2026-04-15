import { useSession } from 'next-auth/react';
import Head from 'next/head';
import NotAuthenticated from '../../../components/NotAuthenticated';
import Breadcrumbs from '../../../components/Breadcrumbs';
import { useItemOriginalImage, usePlaceholder } from '../../../hooks/useItemImage';
import { useState } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'sonner';
import prisma from '../../../utils/prisma';
import { Item, Category } from '@prisma/client';
import { GetServerSideProps } from 'next';
import { serialize } from '@/utils/serialize';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { NumberInput } from '@/components/ui/number-input';
import { CreatableSelect } from '@/components/ui/creatable-select';
import { cn } from '@/lib/utils';

interface ItemWithRelations extends Item {
  categories: Category[];
  reservations: {
    loan: {
      id: string;
      status: string;
      startTime: Date;
      endTime: Date;
    };
  }[];
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  if (!params?.id || typeof params.id !== 'string') return { notFound: true };

  const item = await prisma.item.findUnique({
    where: { id: params.id },
    include: {
      categories: true,
      reservations: { include: { loan: true } },
    },
  });

  if (!item) return { notFound: true };

  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
  return { props: serialize({ item, categories }) };
};

export default function EditItem({
  item,
  categories,
}: {
  item: ItemWithRelations;
  categories: Category[];
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const existingImageSrc = useItemOriginalImage(item.id);
  const placeholder = usePlaceholder();

  const [itemName, setItemName] = useState(item.name);
  const [itemCategories, setItemCategories] = useState(item.categories);
  const [itemDescription, setItemDescription] = useState(item.description);
  const [itemAmount, setItemAmount] = useState(item.amount);
  const [image, setImage] = useState<File | null>(null);
  const [imgError, setImgError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setImage(file);
  };

  const submitImage = async () => {
    if (!image) return;
    setIsSubmitting(true);
    const response = await fetch('/api/item/uploadImage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: item.id, contentType: image.type }),
    });

    if (response.status === 200) {
      const { url, fields } = await response.json();
      const formData = new FormData();
      Object.entries(fields).forEach(([key, value]) => {
        formData.append(key, value as string);
      });
      formData.append('file', image);
      await fetch(url, { method: 'POST', body: formData });
    }
  };

  const updateItem = async () => {
    if (image) await submitImage();

    const response = await fetch('/api/item/editItem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: item.id,
        name: itemName,
        description: itemDescription,
        amount: itemAmount,
        categories: itemCategories,
      }),
    });

    if (response.ok) {
      setIsSubmitting(false);
      toast.success('Kama päivitetty');
      router.push(`/item/${item.id}`);
    } else {
      setIsSubmitting(false);
      toast.error('Virhe kaman päivityksessä');
    }
  };

  if (session?.user?.group !== 'ADMIN') return <NotAuthenticated />;

  const dirtyBorder = (dirty: boolean) =>
    dirty ? 'border-2 border-warning' : '';

  return (
    <>
      <Head>
        <title>Muokkaa kamaa: {item.name} | Klapi</title>
      </Head>
      <Breadcrumbs
        items={[{ label: item.name, href: `/item/${item.id}` }, { label: 'Muokkaa' }]}
      />
      <div className="flex max-w-2xl flex-col gap-6">
        <h1 className="text-xl font-semibold">Muokkaa kamaa</h1>

        <div>
          <Label>Nimi:</Label>
          <Input
            placeholder="Mäkihyppylehti"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            className={cn(dirtyBorder(itemName !== item.name))}
          />
        </div>

        <div>
          <Label>Kuvaus:</Label>
          <Textarea
            placeholder="Viihteeksi reissuille kaluston vessaan."
            value={itemDescription || ''}
            onChange={(e) => setItemDescription(e.target.value)}
            className={cn(dirtyBorder(itemDescription !== item.description))}
          />
        </div>

        <div>
          <Label>Kategoriat:</Label>
          <CreatableSelect
            isMulti
            value={itemCategories.map((cat: Category) => ({ value: cat.id, label: cat.name }))}
            options={categories.map((cat: Category) => ({ value: cat.id, label: cat.name }))}
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
        </div>

        <div>
          <Label>Määrä:</Label>
          <NumberInput min={1} value={itemAmount} onChange={setItemAmount} />
        </div>

        <div>
          <Label>Kuva:</Label>
          {image !== null ? (
            <img
              src={URL.createObjectURL(image)}
              alt={item.name}
              className="mb-4 max-h-[400px] max-w-full object-contain"
            />
          ) : (
            <img
              src={imgError ? placeholder : existingImageSrc}
              alt={item.name}
              onError={() => setImgError(true)}
              className="mb-4 max-h-[400px] max-w-full object-contain"
            />
          )}
          <Input type="file" accept="image/*" onChange={handleImageChange} />
        </div>

        <Button onClick={updateItem} isLoading={isSubmitting} size="lg">
          Tallenna
        </Button>
      </div>
    </>
  );
}
