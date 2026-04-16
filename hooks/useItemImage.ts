import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import {
  getPlaceholderUrl,
  getCompressedImageUrl,
  getOriginalImageUrl,
  getRootImageUrl,
} from '../utils/imageHelpers';

/**
 * Hook that returns the best available image URL for an item (thumbnail version).
 * Tries to load images in order: compressed (thumbnail) -> root -> placeholder
 * This handles the case where a newly uploaded image hasn't been processed by Lambda yet.
 */
function useIsDark(): boolean {
  const { resolvedTheme } = useTheme();
  return resolvedTheme === 'dark';
}

export function useItemImage(itemId: string): string {
  const isDarkMode = useIsDark();
  const placeholder = getPlaceholderUrl(isDarkMode);
  const compressedUrl = getCompressedImageUrl(itemId);
  const rootUrl = getRootImageUrl(itemId);

  const [imageSrc, setImageSrc] = useState<string>(placeholder);

  /* eslint-disable react-hooks/set-state-in-effect -- async image probe callbacks */
  useEffect(() => {
    if (!compressedUrl || !rootUrl) {
      setImageSrc(placeholder);
      return;
    }

    let isMounted = true;

    const compressedImg = new Image();
    compressedImg.onload = () => {
      if (isMounted) setImageSrc(compressedUrl);
    };
    compressedImg.onerror = () => {
      const rootImg = new Image();
      rootImg.onload = () => {
        if (isMounted) setImageSrc(rootUrl);
      };
      rootImg.onerror = () => {
        if (isMounted) setImageSrc(placeholder);
      };
      rootImg.src = rootUrl;
    };
    compressedImg.src = compressedUrl;

    return () => {
      isMounted = false;
    };
  }, [itemId, compressedUrl, rootUrl, placeholder]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return imageSrc;
}

/**
 * Hook that returns the best available original (full-size) image URL for an item.
 * Tries to load images in order: original -> root -> placeholder
 * Use this for item detail pages where you want the full resolution image.
 */
export function useItemOriginalImage(itemId: string): string {
  const isDarkMode = useIsDark();
  const placeholder = getPlaceholderUrl(isDarkMode);
  const originalUrl = getOriginalImageUrl(itemId);
  const rootUrl = getRootImageUrl(itemId);

  const [imageSrc, setImageSrc] = useState<string>(placeholder);

  /* eslint-disable react-hooks/set-state-in-effect -- async image probe callbacks */
  useEffect(() => {
    if (!originalUrl || !rootUrl) {
      setImageSrc(placeholder);
      return;
    }

    let isMounted = true;

    const originalImg = new Image();
    originalImg.onload = () => {
      if (isMounted) setImageSrc(originalUrl);
    };
    originalImg.onerror = () => {
      const rootImg = new Image();
      rootImg.onload = () => {
        if (isMounted) setImageSrc(rootUrl);
      };
      rootImg.onerror = () => {
        if (isMounted) setImageSrc(placeholder);
      };
      rootImg.src = rootUrl;
    };
    originalImg.src = originalUrl;

    return () => {
      isMounted = false;
    };
  }, [itemId, originalUrl, rootUrl, placeholder]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return imageSrc;
}

/**
 * Returns the placeholder URL based on color mode.
 * Use this when you just need the placeholder without the fallback logic.
 */
export function usePlaceholder(): string {
  const isDarkMode = useIsDark();
  return getPlaceholderUrl(isDarkMode);
}
