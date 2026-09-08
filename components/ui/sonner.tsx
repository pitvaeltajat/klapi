'use client';

import { useTheme } from 'next-themes';
import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

export function Toaster({ ...props }: ToasterProps) {
  const { theme = 'system' } = useTheme();
  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      // Bottom-centre, not top-right. Every panel in this app puts its first
      // field at the top — the cart drawer's Kuvaus, a dialog's first input —
      // and the drawer is a right-hand sidebar, so a top-right toast landed
      // squarely on the field you had just been told to fix. The bottom strip
      // is the one place nothing is anchored: the drawer's own footer is
      // inside a `max-w-md` panel on the right, clear of centre.
      position="bottom-center"
      offset={{ bottom: 24 }}
      closeButton
      duration={5000}
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
          error: 'group-[.toaster]:border-destructive/50',
          success: 'group-[.toaster]:border-success/50',
          warning: 'group-[.toaster]:border-warning/50',
        },
      }}
      {...props}
    />
  );
}
