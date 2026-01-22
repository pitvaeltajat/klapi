// Placeholder URLs for light and dark mode
export const PLACEHOLDER_LIGHT = 'https://placehold.co/500x300/e2e8f0/64748b?text=Ei+kuvaa';
export const PLACEHOLDER_DARK = 'https://placehold.co/500x300/1a202c/a0aec0?text=Ei+kuvaa';

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
