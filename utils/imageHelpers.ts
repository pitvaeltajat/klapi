// "Ei kuvaa" placeholders for light and dark mode. Served from public/ rather
// than hot-linked from placehold.co: when that site was slow or rate-limited
// the cards were left as blank grey boxes. The files are the placehold.co
// renders (500x300, EAE7E6/5A5874 and 2D2B50/9FACC6) with the text as paths;
// re-download them from placehold.co if the palette changes.
const PLACEHOLDER_LIGHT = '/placeholder-light.svg';
const PLACEHOLDER_DARK = '/placeholder-dark.svg';

export function getPlaceholderUrl(isDarkMode: boolean): string {
  return isDarkMode ? PLACEHOLDER_DARK : PLACEHOLDER_LIGHT;
}

export function getCompressedImageUrl(itemId: string): string | null {
  const bucketUrl = process.env.NEXT_PUBLIC_AWS_ITEM_PHOTOS_URL;
  if (!bucketUrl) {
    return null;
  }
  return `${bucketUrl}/compressed/${itemId}`;
}

export function getOriginalImageUrl(itemId: string): string | null {
  const bucketUrl = process.env.NEXT_PUBLIC_AWS_ITEM_PHOTOS_URL;
  if (!bucketUrl) {
    return null;
  }
  return `${bucketUrl}/original/${itemId}`;
}

// Returns the root image URL (before Lambda processing)
export function getRootImageUrl(itemId: string): string | null {
  const bucketUrl = process.env.NEXT_PUBLIC_AWS_ITEM_PHOTOS_URL;
  if (!bucketUrl) {
    return null;
  }
  return `${bucketUrl}/${itemId}`;
}
