import { describe, it, expect } from 'vitest';
import { isCustomItemId, isUploadableCustomItemId, newCustomItemId } from '@/utils/customItems';

describe('custom item ids', () => {
  it('mints ids the cart recognises', () => {
    const id = newCustomItemId();
    expect(isCustomItemId(id)).toBe(true);
    expect(isUploadableCustomItemId(id)).toBe(true);
    expect(newCustomItemId()).not.toBe(id);
  });

  it('treats every custom- id as a cart custom item', () => {
    // Ids minted before the UUID scheme still have to skip availability checks.
    expect(isCustomItemId('custom-1738245600000')).toBe(true);
    expect(isCustomItemId('clx8f0h2p0000abcd1234efgh')).toBe(false);
  });

  // This is the security boundary: an uploadable id is signed for S3 and used
  // verbatim as an Item primary key, so nothing but the UUID shape may pass.
  it('only accepts the strict uuid form for uploads and item ids', () => {
    expect(isUploadableCustomItemId('custom-1738245600000')).toBe(false);
    expect(isUploadableCustomItemId('clx8f0h2p0000abcd1234efgh')).toBe(false);
    expect(isUploadableCustomItemId('compressed/clx8f0h2p0000abcd1234efgh')).toBe(false);
    expect(isUploadableCustomItemId('custom-../../clx8f0h2p0000abcd1234efgh')).toBe(false);
    expect(
      isUploadableCustomItemId('custom-3f2504e0-4f89-41d3-9a0c-0305e82c3301/../real-id'),
    ).toBe(false);
    // Right shape, wrong version/variant nibble — still not something we minted.
    expect(isUploadableCustomItemId('custom-3f2504e0-4f89-11d3-9a0c-0305e82c3301')).toBe(false);
    expect(isUploadableCustomItemId('custom-3F2504E0-4F89-41D3-9A0C-0305E82C3301')).toBe(false);
    expect(isUploadableCustomItemId(undefined)).toBe(false);
    expect(isUploadableCustomItemId(42)).toBe(false);
  });
});
