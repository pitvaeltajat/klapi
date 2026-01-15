import { useState, useEffect } from 'react';

/**
 * Hook that delays showing the loading state to prevent flickering
 * @param isLoading - Whether the data is currently loading
 * @param delay - Delay in milliseconds before showing loading state (default: 150ms)
 * @returns Whether to show the loading UI
 */
export function useDelayedLoading(isLoading: boolean, delay: number = 150) {
  const [showLoading, setShowLoading] = useState(false);

  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setShowLoading(true);
      }, delay);

      return () => clearTimeout(timer);
    } else {
      setShowLoading(false);
    }
  }, [isLoading, delay]);

  return showLoading;
}
