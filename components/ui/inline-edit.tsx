'use client';

import * as React from 'react';
import { Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { Input } from './input';
import { Textarea } from './textarea';

/**
 * Click-to-edit for one value shown in place — the detail-page counterpart of
 * the inventory table's editable cells. At rest it renders exactly what the
 * page would have rendered anyway and only reveals a text-field outline on
 * hover, so an item page reads the same to a loaner and quietly gains an editor
 * for an admin.
 *
 * Unlike the table cells these commit on an explicit button rather than on
 * blur: a detail page is not a spreadsheet, the value is often a paragraph, and
 * on a phone "tap somewhere else to save" is not a discoverable gesture.
 */

/** The resting state: the value, plus a pencil that fades in on hover. */
function EditableDisplay({
  onStart,
  label,
  children,
  className,
}: {
  onStart: () => void;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onStart}
      aria-label={`Muokkaa ${label}`}
      className={cn(
        // The negative margin cancels the padding, so the resting value lines
        // up with the rest of the page instead of sitting two pixels in.
        //
        // No `w-full`/`max-w-full`: this is a block-level flex box, so `width:
        // auto` already fills the line. Pinning it to 100% *of the parent* while
        // the negative margins widen the box by 16px left the value with 16px
        // less room than it asks for — enough to break a page title onto a
        // second line mid-word when the row was nowhere near full.
        'group -mx-2 flex items-start gap-1.5 rounded-md border border-transparent px-2 py-1 text-left transition-colors hover:border-input hover:bg-background focus-visible:border-input focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      <span className="min-w-0 flex-1">{children}</span>
      <Pencil
        className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
        aria-hidden
      />
    </button>
  );
}

/** Tallenna / Peruuta, the same pair under every open inline editor. */
function EditActions({
  onSave,
  onCancel,
  saving,
}: {
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <span className="flex gap-2">
      <Button size="sm" variant="success" onClick={onSave} isLoading={saving}>
        Tallenna
      </Button>
      <Button size="sm" variant="outline" onClick={onCancel} disabled={saving}>
        Peruuta
      </Button>
    </span>
  );
}

export interface InlineEditProps {
  /** Stored value. The editor seeds from this every time it opens. */
  value: string;
  /** Persist the new value. Throw to keep the editor open (the caller toasts). */
  onSave: (next: string) => Promise<void>;
  /** What the field is called, in partitive Finnish: "nimeä", "kuvausta". */
  label: string;
  /** Resting rendering of the value. Defaults to the value itself. */
  children?: React.ReactNode;
  /** Resting text when the value is empty — the only hint that the field exists. */
  emptyLabel?: string;
  placeholder?: string;
  /** Long values get a textarea, where Enter inserts a newline instead of saving. */
  multiline?: boolean;
  type?: 'text' | 'number';
  min?: number;
  /** Return an error message to refuse the value, or null when it is fine. */
  validate?: (next: string) => string | null;
  /** Not editable (the viewer isn't an admin) — renders the value plainly. */
  disabled?: boolean;
  className?: string;
  /** Classes for the editor, so it can match the type size it stands in for. */
  inputClassName?: string;
}

export function InlineEdit({
  value,
  onSave,
  label,
  children,
  emptyLabel = 'Ei asetettu',
  placeholder,
  multiline = false,
  type = 'text',
  min,
  validate,
  disabled = false,
  className,
  inputClassName,
}: InlineEditProps) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  // Focus (and select, so typing replaces) as the editor mounts. A ref callback
  // rather than an effect, and rather than autoFocus — which would also yank
  // the page back to this field on any later re-render.
  const focusRef = React.useCallback((el: HTMLInputElement | HTMLTextAreaElement | null) => {
    if (!el) return;
    el.focus();
    el.select();
  }, []);

  const display = children ?? (value || <span className="text-muted-foreground">{emptyLabel}</span>);

  if (disabled) return <>{display}</>;

  const start = () => {
    setDraft(value);
    setError(null);
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setError(null);
  };

  const commit = async () => {
    const next = draft.trim();
    if (next === value.trim()) {
      cancel();
      return;
    }
    const invalid = validate?.(next) ?? null;
    if (invalid) {
      setError(invalid);
      return;
    }
    setSaving(true);
    try {
      await onSave(next);
      setEditing(false);
      setError(null);
    } catch {
      // onSave already surfaced the failure; keep the draft so nothing is retyped.
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <EditableDisplay onStart={start} label={label} className={cn('cursor-text', className)}>
        {display}
      </EditableDisplay>
    );
  }

  return (
    <span className={cn('flex flex-col gap-2', className)}>
      {multiline ? (
        <Textarea
          ref={focusRef}
          value={draft}
          placeholder={placeholder}
          disabled={saving}
          aria-label={label}
          className={inputClassName}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') cancel();
          }}
        />
      ) : (
        <Input
          ref={focusRef}
          type={type}
          min={min}
          value={draft}
          placeholder={placeholder}
          disabled={saving}
          aria-label={label}
          className={inputClassName}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void commit();
            if (e.key === 'Escape') cancel();
          }}
        />
      )}
      {error && <span className="text-xs text-destructive">{error}</span>}
      <EditActions onSave={() => void commit()} onCancel={cancel} saving={saving} />
    </span>
  );
}

export interface InlineEditShellProps {
  editing: boolean;
  onStart: () => void;
  onCancel: () => void;
  onSave: () => void;
  saving?: boolean;
  label: string;
  disabled?: boolean;
  /** Resting rendering of the value. */
  display: React.ReactNode;
  /** The editor itself — a picker, a multi-select, whatever the value needs. */
  children: React.ReactNode;
  className?: string;
}

/**
 * The same affordance for values a text box can't hold — kategoriat, sijainti.
 * The caller owns the picker and its draft state; the hover outline, the pencil
 * and the Tallenna/Peruuta pair come from here so every editable field on a page
 * behaves identically.
 */
export function InlineEditShell({
  editing,
  onStart,
  onCancel,
  onSave,
  saving = false,
  label,
  disabled = false,
  display,
  children,
  className,
}: InlineEditShellProps) {
  if (disabled) return <>{display}</>;

  if (!editing) {
    return (
      <EditableDisplay onStart={onStart} label={label} className={className}>
        {display}
      </EditableDisplay>
    );
  }

  return (
    <span className={cn('flex flex-col gap-2', className)}>
      {children}
      <EditActions onSave={onSave} onCancel={onCancel} saving={saving} />
    </span>
  );
}
