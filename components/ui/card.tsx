'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Two tiers, deliberately. `default` is the page-level panel every view is built
// from; `inset`/`muted` are the nested blocks that live *inside* one (a
// reservation row, a history entry). Before this existed each page invented its
// own radius/padding/shadow combination, so the same panel looked different on
// /account than on /admin.
const cardVariants = cva('', {
  variants: {
    variant: {
      default: 'rounded-lg border bg-card text-card-foreground shadow-xs',
      inset: 'rounded-md border',
      muted: 'rounded-md border bg-muted',
    },
    // Padding steps down one notch on phones. A 390px viewport spends 12% of
    // its width on a p-6 panel's gutters alone, which is what made every card
    // read as "zoomed in" on mobile.
    padding: {
      none: '',
      sm: 'p-3',
      md: 'p-3 sm:p-4',
      lg: 'p-4 sm:p-6',
    },
  },
  defaultVariants: {
    variant: 'default',
    padding: 'lg',
  },
});

type CardElement = 'div' | 'section' | 'article' | 'li' | 'details' | 'label';

export interface CardProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof cardVariants> {
  /** Element to render. Defaults to `div`; use `section` for landmarks. */
  as?: CardElement;
  /** Only meaningful with `as="details"`. */
  open?: boolean;
}

export const Card = React.forwardRef<HTMLElement, CardProps>(
  ({ className, variant, padding, as = 'div', ...props }, ref) =>
    React.createElement(as, {
      ref,
      className: cn(cardVariants({ variant, padding }), className),
      ...props,
    }),
);
Card.displayName = 'Card';

/**
 * Title row inside a Card. Carries its own bottom margin so panels are spaced
 * identically everywhere — pass `className="mb-0"` on the rare card that
 * doesn't want it.
 */
export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2
      ref={ref}
      className={cn('mb-3 text-lg font-semibold sm:mb-4 sm:text-xl', className)}
      {...props}
    />
  ),
);
CardTitle.displayName = 'CardTitle';

/**
 * The same heading style for a page section that is *not* a panel — one whose
 * content is itself a list of cards, so wrapping it in another Card would just
 * nest borders (the account page's loan history). Shares CardTitle's styling so
 * section and panel headings can't drift apart; use CardTitle inside a Card.
 */
export const SectionTitle = CardTitle;

/**
 * Wraps a CardTitle plus trailing actions on one row. Neutralises the title's
 * own margin so the spacing stays on the header.
 */
export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'mb-3 flex flex-wrap items-center justify-between gap-2 sm:mb-4 [&>h2]:mb-0',
        className,
      )}
      {...props}
    />
  ),
);
CardHeader.displayName = 'CardHeader';

export { cardVariants };
