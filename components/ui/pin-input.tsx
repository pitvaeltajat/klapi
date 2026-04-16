'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface PinInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  type?: 'number' | 'text';
  autoFocus?: boolean;
  className?: string;
}

export function PinInput({ length = 4, value, onChange, type = 'text', autoFocus, className }: PinInputProps) {
  const refs = React.useRef<Array<HTMLInputElement | null>>([]);
  const chars = Array.from({ length }, (_, i) => value[i] ?? '');

  const focus = (i: number) => refs.current[i]?.focus();

  const handleChange = (i: number, v: string) => {
    const clean = type === 'number' ? v.replace(/\D/g, '') : v;
    if (!clean) {
      const next = chars.slice();
      next[i] = '';
      onChange(next.join('').replace(/\s+$/g, ''));
      return;
    }
    const next = chars.slice();
    // Support paste
    for (let j = 0; j < clean.length && i + j < length; j++) {
      next[i + j] = clean[j];
    }
    onChange(next.join(''));
    const nextIdx = Math.min(i + clean.length, length - 1);
    focus(nextIdx);
  };

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !chars[i] && i > 0) {
      focus(i - 1);
    } else if (e.key === 'ArrowLeft' && i > 0) {
      focus(i - 1);
    } else if (e.key === 'ArrowRight' && i < length - 1) {
      focus(i + 1);
    }
  };

  return (
    <div className={cn('flex gap-2', className)}>
      {chars.map((c, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type={type === 'number' ? 'tel' : 'text'}
          inputMode={type === 'number' ? 'numeric' : 'text'}
          maxLength={1}
          value={c}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKey(i, e)}
          autoFocus={autoFocus && i === 0}
          className="h-12 w-12 rounded-md border border-input bg-background text-center text-lg font-semibold ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      ))}
    </div>
  );
}
