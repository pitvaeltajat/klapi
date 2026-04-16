'use client';

import { Spinner } from '@/components/ui/spinner';

interface LoadingSpinnerProps {
  fullWidth?: boolean;
  minHeight?: string;
}

export default function LoadingSpinner({
  fullWidth = false,
  minHeight = '50vh',
}: LoadingSpinnerProps) {
  const content = (
    <div className="flex items-center justify-center" style={{ minHeight }}>
      <Spinner size="xl" />
    </div>
  );

  if (fullWidth) {
    return content;
  }

  return <div className="container mx-auto px-4">{content}</div>;
}
