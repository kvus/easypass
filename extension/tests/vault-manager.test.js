import { describe, it, expect } from 'vitest';
import {
  addEntry,
  editEntry,
  deleteEntry,
  searchEntries,
} from '../modules/vault-manager';

// Fixture vault với 2 items
const baseVault = {
  version: 1,
  items: [
    {
      itemId:   'id-001',
      siteName: 'GitHub',
      siteUrl:  'https://github.com',
      username: 'alice',
      password: 'pass1',
      notes:    'work account',
      category: 'work',
      createdAt: '2024-01-01T00:00:00.000Z',
    },
    {
      itemId:   'id-002',
      siteName: 'Gmail',
      siteUrl:  'https://mail.google.com',
      username: 'alice@gmail.com',
      password: 'pass2',
      notes:    '',
      category: 'email',
      createdAt: '2024-01-02T00:00:00.000Z',
    },
  ],
};

describe('vault-manager', () => {
  // ---- addEntry ----
  describe('addEntry', () => {
    it('appends a new item and returns a new vault object', () => {
      const result = addEntry(baseVault, {
        siteName: 'Twitter',
        siteUrl:  'https://twitter.com',
        username: 'alice_t',
        password: 'secret',
        notes:    '',
        category: 'social',
      });

      expect(result.items).toHaveLength(3);
      expect(result).not.toBe(baseVault); // immutable — new reference
      expect(baseVault.items).toHaveLength(2); // original untouched
    });

    it('new item has itemId, createdAt, and correct fields', () => {
      const result = addEntry(baseVault, { siteName: 'Test', password: 'pw' });
      const added  = result.items[2];

      expect(added.itemId).toBeTruthy();
      expect(added.createdAt).toBeTruthy();
      expect(added.siteName).toBe('Test');
      expect(added.password).toBe('pw');
    });

    it('fills missing optional fields with empty strings / defaults', () => {
      const result = addEntry(baseVault, { siteName: 'Minimal' });
      const added  = result.items[2];

      expect(added.siteUrl).toBe('');
      expect(added.username).toBe('');
      expect(added.notes).toBe('');
      expect(added.category).toBe('other');
    });
  });

  // ---- editEntry ----
  describe('editEntry', () => {
    it('updates only the specified item by itemId', () => {
      const result  = editEntry(baseVault, 'id-001', { password: 'newpass' });
      const updated = result.items.find(i => i.itemId === 'id-001');
      const other   = result.items.find(i => i.itemId === 'id-002');

      expect(updated.password).toBe('newpass');
      expect(updated.siteName).toBe('GitHub'); // unchanged fields preserved
      expect(other.password).toBe('pass2');     // other item untouched
    });

    it('returns a new vault and new item reference (immutable)', () => {
      const result = editEntry(baseVault, 'id-001', { notes: 'updated' });

      expect(result).not.toBe(baseVault);
      expect(result.items[0]).not.toBe(baseVault.items[0]);
    });

    it('leaves vault unchanged if itemId does not exist', () => {
      const result = editEntry(baseVault, 'nonexistent', { password: 'x' });
      expect(result.items).toEqual(baseVault.items);
    });
  });

  // ---- deleteEntry ----
  describe('deleteEntry', () => {
    it('removes the item with matching itemId', () => {
      const result = deleteEntry(baseVault, 'id-001');

      expect(result.items).toHaveLength(1);
      expect(result.items.find(i => i.itemId === 'id-001')).toBeUndefined();
    });

    it('keeps other items intact', () => {
      const result = deleteEntry(baseVault, 'id-001');
      expect(result.items[0].itemId).toBe('id-002');
    });

    it('returns original count if itemId does not exist', () => {
      const result = deleteEntry(baseVault, 'nonexistent');
      expect(result.items).toHaveLength(2);
    });

    it('returns a new vault reference (immutable)', () => {
      const result = deleteEntry(baseVault, 'id-001');
      expect(result).not.toBe(baseVault);
    });
  });

  // ---- searchEntries ----
  describe('searchEntries', () => {
    it('returns all items for empty keyword', () => {
      expect(searchEntries(baseVault, '').length).toBe(2);
      expect(searchEntries(baseVault, '  ').length).toBe(2);
    });

    it('matches by siteName (case-insensitive)', () => {
      const result = searchEntries(baseVault, 'github');
      expect(result).toHaveLength(1);
      expect(result[0].itemId).toBe('id-001');
    });

    it('matches by username', () => {
      const result = searchEntries(baseVault, 'alice@gmail');
      expect(result).toHaveLength(1);
      expect(result[0].itemId).toBe('id-002');
    });

    it('matches by notes', () => {
      const result = searchEntries(baseVault, 'work account');
      expect(result).toHaveLength(1);
      expect(result[0].itemId).toBe('id-001');
    });

    it('returns empty array if no match', () => {
      expect(searchEntries(baseVault, 'xxxxxxxx')).toHaveLength(0);
    });
  });
});
