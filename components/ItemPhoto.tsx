'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { ImagePlus, Loader2 } from 'lucide-react';
import { useItemOriginalImageState } from '@/hooks/useItemImage';
import { Skeleton } from '@/components/ui/skeleton';
import { readJson } from '@/utils/apiError';

/**
 * The photo still gets a box of its own — the picture's dimensions aren't known
 * until it has loaded, so a self-sizing <img> would leave the skeleton standing
 * in for a box of the wrong size and the page would jump the moment the picture
 * landed. The box just stops guessing the *shape*: it opens at the placeholder's
 * 5:3 and then adopts the photo's own ratio, so a 4:3 phone snap fills it
 * instead of sitting in a letterbox of grey.
 */
const PLACEHOLDER_RATIO = 5 / 3;
/** A tall picture may not turn the page into a column, nor a panorama into a slit. */
const MIN_RATIO = 3 / 4;
const MAX_RATIO = 3;

const clampRatio = (ratio: number) => Math.min(MAX_RATIO, Math.max(MIN_RATIO, ratio));

/**
 * The kama photo on `/item/[id]`, and — while the kama has none — the offer to
 * take one. Anyone signed in may fill in a missing picture: half the catalogue
 * has no photo and the person holding the kama is the one who can take it.
 * Replacing a photo that already exists stays an admin job (Muokkaa), and the
 * upload route enforces that; the kiosk terminal is left out, it has no camera.
 */
export default function ItemPhoto({ itemId, itemName }: { itemId: string; itemName: string }) {
  const router = useRouter();
  const { data: session } = useSession();
  const { src, status, placeholder } = useItemOriginalImageState(itemId);

  // The just-uploaded file, shown straight from the browser: S3 has it, but the
  // Lambda behind `original/` needs a moment and re-probing would flash the
  // placeholder back in the meantime.
  const [uploaded, setUploaded] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [ratio, setRatio] = useState<number | null>(null);
  const [imgError, setImgError] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // The blob URL for the local preview is ours to release.
  useEffect(() => () => { if (uploaded) URL.revokeObjectURL(uploaded); }, [uploaded]);

  const hasPhoto = uploaded !== null || status === 'loaded';
  const canAdd =
    !hasPhoto &&
    status !== 'loading' &&
    Boolean(session?.user) &&
    session?.user?.group !== 'KIOSK';

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const response = await fetch('/api/item/uploadImage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: itemId, contentType: file.type }),
      });
      const { url, fields } = await readJson<{ url: string; fields: Record<string, string> }>(
        response,
        'Kuvan lataus epäonnistui',
      );
      const formData = new FormData();
      Object.entries(fields).forEach(([key, value]) => formData.append(key, value));
      formData.append('file', file);
      const stored = await fetch(url, { method: 'POST', body: formData });
      if (!stored.ok) throw new Error('Kuvan tallennus epäonnistui');

      setUploaded(URL.createObjectURL(file));
      setImgError(false);
      toast.success('Kuva lisätty');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kuvan tallennus epäonnistui');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="relative w-full max-w-2xl overflow-hidden rounded-md bg-muted"
      style={{ aspectRatio: ratio ?? PLACEHOLDER_RATIO }}
    >
      {status === 'loading' ? (
        <Skeleton className="h-full w-full rounded-md" />
      ) : hasPhoto ? (
        /* eslint-disable-next-line @next/next/no-img-element -- dynamic S3 URL with onError fallback */
        <img
          src={uploaded ?? (imgError ? placeholder : src)}
          alt={itemName}
          onError={() => setImgError(true)}
          onLoad={(e) => {
            const { naturalWidth, naturalHeight } = e.currentTarget;
            if (naturalWidth && naturalHeight) setRatio(clampRatio(naturalWidth / naturalHeight));
          }}
          className="h-full w-full object-contain"
        />
      ) : canAdd ? (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              // Cleared first: picking the same file twice must still fire onChange.
              e.target.value = '';
              if (file) void upload(file);
            }}
          />
          {/* The whole empty box is the button — "Ei kuvaa" with a pill floating
              over it read as a picture of a caption, not as something to press. */}
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-input text-muted-foreground transition-colors hover:border-primary hover:bg-background hover:text-foreground focus-visible:border-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          >
            {uploading ? (
              <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
            ) : (
              <ImagePlus className="h-8 w-8" aria-hidden />
            )}
            <span className="text-sm font-medium">{uploading ? 'Ladataan…' : 'Lisää kuva'}</span>
            {!uploading && <span className="text-xs">Kamasta ei ole vielä kuvaa</span>}
          </button>
        </>
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element -- the "Ei kuvaa" placeholder */
        <img src={placeholder} alt={itemName} className="h-full w-full object-contain" />
      )}
    </div>
  );
}
