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
