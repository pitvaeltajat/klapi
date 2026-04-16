import { useState, useEffect } from 'react';

/**
 * Hook that delays showing the loading state to prevent flickering
 * @param isLoading - Whether the data is currently loading
 * @param delay - Delay in milliseconds before showing loading state (default: 150ms)
 * @returns Whether to show the loading UI
 */
export function useDelayedLoading(isLoading: boolean, delay: number = 150) {
  const [showLoading, setShowLoading] = useState(false);

  if (!isLoading && showLoading) {
    setShowLoading(false);
  }

  useEffect(() => {
    if (!isLoading) return;
    const timer = setTimeout(() => {
      setShowLoading(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [isLoading, delay]);

  return showLoading;
}
