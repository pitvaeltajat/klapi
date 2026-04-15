import * as React from 'react';
import { cn } from '@/lib/utils';

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  indeterminate?: boolean;
}

export function Progress({ value, indeterminate, className, ...props }: ProgressProps) {
  return (
    <div
      className={cn('relative h-1 w-full overflow-hidden bg-primary/20', className)}
      role="progressbar"
      {...props}
    >
      {indeterminate ? (
        <div className="absolute inset-y-0 left-0 w-1/3 animate-[progress-indeterminate_1.2s_ease-in-out_infinite] bg-primary" />
      ) : (
        <div className="h-full bg-primary transition-all" style={{ width: `${value ?? 0}%` }} />
      )}
    </div>
  );
}
