'use client';

import React from 'react';
import { useCart } from '@/contexts/CartContext';
import { ImagePlus, ShoppingCart, X } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { newCustomItemId } from '@/utils/customItems';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

/** The presigned upload caps the object at 10 MB; checked here for a real error. */
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export default function CustomItemDialog({ isOpen, onClose }: Props) {
  const [name, setName] = React.useState('');
  const [amount, setAmount] = React.useState<number>(1);
  const [image, setImage] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { addToCart } = useCart();
  const { data: session } = useSession();

  // The kiosk is a shared terminal standing in the storage room — there's no
  // phone to pick a picture from, so it gets the name and the amount only.
  const canAddImage = session?.user?.group !== 'KIOSK';

  // Blob URLs for the local preview are ours to release.
  React.useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  const pickImage = (file: File | null) => {
    setImage(file);
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
    // Clearing the picture has to clear the file input too, or it keeps
    // announcing the removed file's name next to "Ei kuvaa valittuna" — and
    // re-picking the same file wouldn't fire a change event.
    if (!file && fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file && file.size > MAX_IMAGE_BYTES) {
      toast.error('Kuva on liian suuri', { description: 'Kuvan enimmäiskoko on 10 Mt.' });
      e.target.value = '';
      return;
    }
    pickImage(file);
  };

  const uploadImage = async (itemId: string, file: File) => {
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

  const resetForm = () => {
    setName('');
    setAmount(1);
    pickImage(null);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.warning('Anna kaman nimi');
      return;
    }
    // Minted here rather than by the database: the picture goes to S3 under
    // this id now, and the item row is created with it when the loan is sent.
    const id = newCustomItemId();
    setSubmitting(true);
    try {
      if (image) {
        try {
          await uploadImage(id, image);
        } catch (err) {
          // The picture is a nicety — never a reason to lose the typed-in kama.
          toast.warning('Kuvaa ei saatu tallennettua', {
            description: err instanceof Error ? err.message : undefined,
          });
        }
      }
      addToCart({ id, name: name.trim(), amount });
      toast.success('Lisätty koriin', { description: name });
      resetForm();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => (!o ? handleClose() : null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lisää oma kama lainaan</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Field label="Nimi" required htmlFor="custom-name">
            <Input
              id="custom-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Kaman nimi"
            />
          </Field>

          <Field label="Määrä" required htmlFor="custom-amount">
            <NumberInput id="custom-amount" min={1} value={amount} onChange={setAmount} />
          </Field>

          {canAddImage && (
            <Field
              label="Kuva (valinnainen)"
              htmlFor="custom-image"
              helper="Kuvan voi jättää lisäämättä. Se auttaa tunnistamaan kaman palautuksessa."
            >
              {/* Fixed box, `object-contain` inside it: sizing the box off the
                  photo reflowed the dialog differently for every file, and a
                  sliver of an image left no corner to pin the remove button to. */}
              {preview ? (
                <div className="relative aspect-5/3 w-full max-w-sm overflow-hidden rounded-md bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
                  <img src={preview} alt="Esikatselu" className="h-full w-full object-contain" />
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon-sm"
                    className="absolute right-1.5 top-1.5"
                    aria-label="Poista kuva"
                    onClick={() => pickImage(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ImagePlus className="h-4 w-4 shrink-0" aria-hidden />
                  Ei kuvaa valittuna
                </p>
              )}
              <Input
                ref={fileInputRef}
                id="custom-image"
                type="file"
                accept="image/*"
                className="mt-2"
                onChange={handleImageChange}
              />
            </Field>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Peruuta
          </Button>
          <Button onClick={handleSubmit} className="gap-2" disabled={submitting}>
            {submitting ? 'Lisätään…' : 'Lisää'}
            <ShoppingCart className="h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
