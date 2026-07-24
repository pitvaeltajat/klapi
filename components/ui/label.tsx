'use client';

import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const labelVariants = cva('leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70', {
  variants: {
    size: {
      /** Ordinary form field label. */
      default: 'text-sm font-medium',
      /**
       * Heads a whole block rather than one input — the kiosk's "Lainaaja" /
       * "Palautuspäivä" panels. Callers used to hand-roll this three different
       * ways off the default size.
       */
      section: 'mb-2 block text-lg font-bold',
    },
  },
  defaultVariants: {
    size: 'default',
  },
});

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & VariantProps<typeof labelVariants>
>(({ className, size, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn(labelVariants({ size }), className)} {...props} />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label, labelVariants };
