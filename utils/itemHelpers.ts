import type { ItemHistoryAction } from '@prisma/client';

// Client-safe item helpers — must NOT import prisma (this is imported by the
// `'use client'` ItemView). Mirrors the loan equivalents in loanHelpers.ts.

export const getItemHistoryActionLabel = (action: ItemHistoryAction): string => {
  switch (action) {
    case 'CREATED':
      return 'Kama luotu';
    case 'UPDATED':
      return 'Kamaa muokattu';
    case 'ARCHIVED':
      return 'Kama arkistoitu';
    case 'RESTORED':
      return 'Kama palautettu';
    case 'PROMOTED':
      return 'Väliaikainen kama vakinaistettu';
    default:
      return action;
  }
};

const FIELD_LABELS: Record<string, string> = {
  name: 'Nimi',
  description: 'Kuvaus',
  amount: 'Määrä',
  location: 'Sijainti',
  categories: 'Kategoriat',
  type: 'Tyyppi',
};

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  return String(value);
};

/**
 * Turns a history entry's `details` into human-readable lines. Renders a free
 * text `note` (used by coarse bulk actions) followed by any `changed` field
 * diff like `Määrä: 4 → 6`. Returns [] when there is nothing to show.
 * Defensive about shape since `details` is free-form JSON read back from the DB.
 */
export const formatItemHistoryChanges = (details: unknown): string[] => {
  if (!details || typeof details !== 'object') return [];
  const lines: string[] = [];

  const note = (details as { note?: unknown }).note;
  if (typeof note === 'string' && note) lines.push(note);

  const changed = (details as { changed?: Record<string, { from: unknown; to: unknown }> })
    .changed;
  if (changed && typeof changed === 'object') {
    for (const [field, { from, to }] of Object.entries(changed)) {
      const label = FIELD_LABELS[field] ?? field;
      lines.push(`${label}: ${formatValue(from)} → ${formatValue(to)}`);
    }
  }

  return lines;
};

/** Whether a history entry originated from a bulk action (sets a `bulk` flag). */
export const isBulkItemHistory = (details: unknown): boolean =>
  !!details &&
  typeof details === 'object' &&
  (details as { bulk?: boolean }).bulk === true;
