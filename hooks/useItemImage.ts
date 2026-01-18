import { useState, useEffect } from 'react';
import { useColorModeValue } from '@chakra-ui/react';
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
export function useItemImage(itemId: string): string {
  const isDarkMode = useColorModeValue(false, true);
  const placeholder = getPlaceholderUrl(isDarkMode);
  const compressedUrl = getCompressedImageUrl(itemId);
  const rootUrl = getRootImageUrl(itemId);

  const [imageSrc, setImageSrc] = useState<string>(placeholder);

  useEffect(() => {
    if (!compressedUrl || !rootUrl) {
      setImageSrc(placeholder);
      return;
    }

    let isMounted = true;

    // Try compressed image first
    const compressedImg = new Image();
    compressedImg.onload = () => {
      if (isMounted) {
        setImageSrc(compressedUrl);
      }
    };
    compressedImg.onerror = () => {
      // If compressed fails, try root image
      const rootImg = new Image();
      rootImg.onload = () => {
        if (isMounted) {
          setImageSrc(rootUrl);
        }
      };
      rootImg.onerror = () => {
        // Keep placeholder if both fail
        if (isMounted) {
          setImageSrc(placeholder);
        }
      };
      rootImg.src = rootUrl;
    };
    compressedImg.src = compressedUrl;

    return () => {
      isMounted = false;
    };
  }, [itemId, compressedUrl, rootUrl, placeholder]);

  return imageSrc;
}

/**
 * Hook that returns the best available original (full-size) image URL for an item.
 * Tries to load images in order: original -> root -> placeholder
 * Use this for item detail pages where you want the full resolution image.
 */
export function useItemOriginalImage(itemId: string): string {
  const isDarkMode = useColorModeValue(false, true);
  const placeholder = getPlaceholderUrl(isDarkMode);
  const originalUrl = getOriginalImageUrl(itemId);
  const rootUrl = getRootImageUrl(itemId);

  const [imageSrc, setImageSrc] = useState<string>(placeholder);

  useEffect(() => {
    if (!originalUrl || !rootUrl) {
      setImageSrc(placeholder);
      return;
    }

    let isMounted = true;

    // Try original image first
    const originalImg = new Image();
    originalImg.onload = () => {
      if (isMounted) {
        setImageSrc(originalUrl);
      }
    };
    originalImg.onerror = () => {
      // If original fails, try root image
      const rootImg = new Image();
      rootImg.onload = () => {
        if (isMounted) {
          setImageSrc(rootUrl);
        }
      };
      rootImg.onerror = () => {
        // Keep placeholder if both fail
        if (isMounted) {
          setImageSrc(placeholder);
        }
      };
      rootImg.src = rootUrl;
    };
    originalImg.src = originalUrl;

    return () => {
      isMounted = false;
    };
  }, [itemId, originalUrl, rootUrl, placeholder]);

  return imageSrc;
}

/**
 * Returns the placeholder URL based on color mode.
 * Use this when you just need the placeholder without the fallback logic.
 */
export function usePlaceholder(): string {
  const isDarkMode = useColorModeValue(false, true);
  return getPlaceholderUrl(isDarkMode);
}
