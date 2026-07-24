'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button, type ButtonProps } from '@/components/ui/button';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  /** Muted line under the title; use `children` for richer bodies. */
  description?: React.ReactNode;
  children?: React.ReactNode;
  confirmLabel: React.ReactNode;
  cancelLabel?: React.ReactNode;
  confirmVariant?: ButtonProps['variant'];
  onConfirm: () => void;
  /** Spins the confirm button and locks both buttons plus dismissal. */
  isLoading?: boolean;
  className?: string;
}

/**
 * The "are you sure?" dialog, in one place. The hand-rolled copies had drifted
 * apart in ways users notice: some put the confirm button on the left and the
 * cancel on the right, others the reverse, and the cancel button was `outline`
 * on three pages and `secondary` on three more. Here cancel is always left,
 * always `outline`, and the destructive action is always on the right.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmLabel,
  cancelLabel = 'Peruuta',
  confirmVariant = 'destructive',
  onConfirm,
  isLoading = false,
  className,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !isLoading && onOpenChange(next)}>
      <DialogContent className={className}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children && <div className="text-sm">{children}</div>}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} isLoading={isLoading}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
