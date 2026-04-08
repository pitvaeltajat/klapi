import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatDate, formatDateShort, renderItemCard, renderLoanDetails } from '../utils/emailHelpers';

describe('formatDate', () => {
  it('should format a Date object in Finnish locale with timezone', () => {
    const date = new Date('2026-06-15T18:00:00.000Z');
    const result = formatDate(date);

    // Should contain Finnish day/month and time
    expect(result).toContain('2026');
    expect(result).toContain('kesäkuu');
    expect(result).toContain('15');
  });

  it('should accept a string date', () => {
    const result = formatDate('2026-12-24T12:00:00.000Z');
    expect(result).toContain('2026');
    expect(result).toContain('joulukuu');
    expect(result).toContain('24');
  });

  it('should use Europe/Helsinki timezone', () => {
    // UTC midnight should show as Finnish time (UTC+2 or UTC+3)
    const date = new Date('2026-06-15T00:00:00.000Z');
    const result = formatDate(date);
    // In Finland summer time (UTC+3), midnight UTC = 03:00 Finnish time
    expect(result).toContain('03');
  });

  it('should include weekday', () => {
    // June 15, 2026 is a Monday
    const date = new Date('2026-06-15T12:00:00.000Z');
    const result = formatDate(date);
    expect(result).toContain('maanantai');
  });
});

describe('formatDateShort', () => {
  it('should format date without weekday or time', () => {
    const date = new Date('2026-06-15T18:00:00.000Z');
    const result = formatDateShort(date);

    expect(result).toContain('2026');
    expect(result).toContain('kesäkuu');
    expect(result).toContain('15');
    // Should NOT contain time
    expect(result).not.toContain('18');
    // Should NOT contain weekday
    expect(result).not.toContain('maanantai');
  });

  it('should accept a string date', () => {
    const result = formatDateShort('2026-01-01T00:00:00.000Z');
    expect(result).toContain('tammikuu');
  });
});

describe('renderItemCard', () => {
  beforeEach(() => {
    // Clear any env vars
    vi.stubEnv('NEXT_PUBLIC_AWS_ITEM_PHOTOS_URL', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should render item name and amount', () => {
    const html = renderItemCard({ id: 'item-1', name: 'Teltta', amount: 3 });
    expect(html).toContain('Teltta');
    expect(html).toContain('3 kpl');
  });

  it('should show "Ei kuvaa" placeholder when no image URL configured', () => {
    const html = renderItemCard({ id: 'item-1', name: 'Test', amount: 1 });
    expect(html).toContain('Ei kuvaa');
  });

  it('should include image tag when AWS URL is configured', () => {
    vi.stubEnv('NEXT_PUBLIC_AWS_ITEM_PHOTOS_URL', 'https://bucket.s3.amazonaws.com');
    const html = renderItemCard({ id: 'item-1', name: 'Test', amount: 1 });
    expect(html).toContain('<img');
    expect(html).toContain('https://bucket.s3.amazonaws.com/compressed/item-1');
  });

  it('should contain item-card CSS class', () => {
    const html = renderItemCard({ id: 'item-1', name: 'Test', amount: 1 });
    expect(html).toContain('class="item-card"');
  });
});

describe('renderLoanDetails', () => {
  it('should render start and end times', () => {
    const html = renderLoanDetails(
      new Date('2026-06-01T18:00:00.000Z'),
      new Date('2026-06-07T18:00:00.000Z'),
    );
    expect(html).toContain('Nouto:');
    expect(html).toContain('Palautus:');
    expect(html).toContain('kesäkuu');
  });

  it('should include description when provided', () => {
    const html = renderLoanDetails(
      new Date('2026-06-01T18:00:00.000Z'),
      new Date('2026-06-07T18:00:00.000Z'),
      'Partioretki',
    );
    expect(html).toContain('Kuvaus:');
    expect(html).toContain('Partioretki');
  });

  it('should not include description section when not provided', () => {
    const html = renderLoanDetails(
      new Date('2026-06-01T18:00:00.000Z'),
      new Date('2026-06-07T18:00:00.000Z'),
    );
    expect(html).not.toContain('Kuvaus:');
  });

  it('should not include description section when null', () => {
    const html = renderLoanDetails(
      new Date('2026-06-01T18:00:00.000Z'),
      new Date('2026-06-07T18:00:00.000Z'),
      null,
    );
    expect(html).not.toContain('Kuvaus:');
  });

  it('should accept string dates', () => {
    const html = renderLoanDetails('2026-06-01T18:00:00.000Z', '2026-06-07T18:00:00.000Z');
    expect(html).toContain('Nouto:');
    expect(html).toContain('Palautus:');
  });
});
