import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import {
  getPlaceholderUrl,
  getCompressedImageUrl,
  getOriginalImageUrl,
  getRootImageUrl,
} from '../utils/imageHelpers';

function useIsDark(): boolean {
  const { resolvedTheme } = useTheme();
  return resolvedTheme === 'dark';
}

/** Loading lifecycle of an item-image probe. */
export type ItemImageStatus = 'loading' | 'loaded' | 'placeholder';

export interface ItemImage {
  /** Best URL to render: the resolved image when `loaded`, otherwise the placeholder. */
  src: string;
  status: ItemImageStatus;
  /** Theme-aware "Ei kuvaa" placeholder — handy as an `onError` fallback. */
  placeholder: string;
}

/**
 * Probes a list of candidate URLs in order and reports which one actually
 * loaded. `status` stays `'loading'` until the first candidate resolves, so
 * callers can show a skeleton instead of flashing the placeholder while we
 * wait. Falls back to `'placeholder'` only when every candidate fails (or there
 * are none) — i.e. when the item genuinely has no image.
 */
function useProbedImage(candidates: (string | null)[], placeholder: string): ItemImage {
  const urls = candidates.filter((u): u is string => Boolean(u));
  const key = urls.join('|');

  const [state, setState] = useState<{ src: string | null; status: ItemImageStatus }>(() => ({
    src: null,
    status: urls.length === 0 ? 'placeholder' : 'loading',
  }));

  /* eslint-disable react-hooks/set-state-in-effect -- async image probe callbacks */
  useEffect(() => {
    if (urls.length === 0) {
      setState({ src: null, status: 'placeholder' });
      return;
    }

    let isMounted = true;
    setState({ src: null, status: 'loading' });

    const probe = (i: number) => {
      if (i >= urls.length) {
        if (isMounted) setState({ src: null, status: 'placeholder' });
        return;
      }
      const img = new Image();
      img.onload = () => {
        if (isMounted) setState({ src: urls[i], status: 'loaded' });
      };
      img.onerror = () => probe(i + 1);
      img.src = urls[i];
    };
    probe(0);

    return () => {
      isMounted = false;
    };
    // `key` encodes the candidate list; `placeholder` is intentionally excluded
    // so toggling the theme doesn't re-probe — the fresh placeholder is applied
    // in the return value below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return {
    src: state.status === 'loaded' && state.src ? state.src : placeholder,
    status: state.status,
    placeholder,
  };
}

/**
 * Thumbnail image probe state for an item: compressed → root → placeholder.
 * Use this on cards/grids that want a loading skeleton.
 */
export function useItemImageState(itemId: string): ItemImage {
  const placeholder = getPlaceholderUrl(useIsDark());
  return useProbedImage([getCompressedImageUrl(itemId), getRootImageUrl(itemId)], placeholder);
}

/**
 * Thumbnail image URL for an item (compressed → root → placeholder). Returns
 * just the URL; while probing it returns the placeholder. Prefer
 * {@link useItemImageState} when you want a skeleton instead of the flash.
 */
export function useItemImage(itemId: string): string {
  return useItemImageState(itemId).src;
}

/**
 * Full-resolution image probe state for an item: original → root → placeholder.
 * Detail views use this to render a skeleton while loading and only fall back
 * to the placeholder when the item truly has no image.
 */
export function useItemOriginalImageState(itemId: string): ItemImage {
  const placeholder = getPlaceholderUrl(useIsDark());
  return useProbedImage([getOriginalImageUrl(itemId), getRootImageUrl(itemId)], placeholder);
}

/**
 * Full-resolution image URL for an item (original → root → placeholder).
 * Returns just the URL. Prefer {@link useItemOriginalImageState} when you want
 * a skeleton instead of the placeholder flash.
 */
export function useItemOriginalImage(itemId: string): string {
  return useItemOriginalImageState(itemId).src;
}

/**
 * Returns the placeholder URL based on color mode.
 * Use this when you just need the placeholder without the fallback logic.
 */
export function usePlaceholder(): string {
  return getPlaceholderUrl(useIsDark());
}
