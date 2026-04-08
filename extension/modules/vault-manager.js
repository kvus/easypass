// ============================================================
//  VaultManager — CRUD on decrypted VaultData in RAM
//  NEVER encrypts or calls network — pure data manipulation
// ============================================================

/**
 * List all entries, optionally filtered by category
 * @param {Object} vaultData
 * @param {string|null} filter — category string or null for all
 * @returns {Array<Object>} PasswordItem[]
 */
export function listEntries(vaultData, filter = null) {
  if (!filter || filter === 'all') return [...vaultData.items];
  return vaultData.items.filter(item => item.category === filter);
}

/**
 * Search entries by site name, username, or URL (case-insensitive)
 * @param {Object} vaultData
 * @param {string} keyword
 * @returns {Array<Object>} PasswordItem[]
 */
export function searchEntries(vaultData, keyword) {
  if (!keyword || keyword.trim() === '') return [...vaultData.items];
  const kw = keyword.toLowerCase().trim();
  return vaultData.items.filter(item =>
    (item.siteName || '').toLowerCase().includes(kw) ||
    (item.username || '').toLowerCase().includes(kw) ||
    (item.siteUrl  || '').toLowerCase().includes(kw) ||
    (item.notes    || '').toLowerCase().includes(kw)
  );
}

/**
 * Add a new password entry
 * Generates a unique itemId and timestamps it
 *
 * @param {Object} vaultData
 * @param {Object} newItem — { siteName, siteUrl, username, password, notes, category }
 * @returns {Object} updated VaultData (immutable -- returns new object)
 */
export function addEntry(vaultData, newItem) {
  const entry = {
    itemId:    crypto.randomUUID(),
    siteName:  newItem.siteName  || '',
    siteUrl:   newItem.siteUrl   || '',
    username:  newItem.username  || '',
    password:  newItem.password  || '',
    notes:     newItem.notes     || '',
    category:  newItem.category  || 'other',
    createdAt: new Date().toISOString()
  };
  return {
    ...vaultData,
    items: [...vaultData.items, entry]
  };
}

/**
 * Edit an existing entry by itemId
 * @param {Object} vaultData
 * @param {string} itemId
 * @param {Object} updates — partial fields to update
 * @returns {Object} updated VaultData
 */
export function editEntry(vaultData, itemId, updates) {
  const items = vaultData.items.map(item =>
    item.itemId === itemId ? { ...item, ...updates } : item
  );
  return { ...vaultData, items };
}

/**
 * Delete an entry by itemId
 * @param {Object} vaultData
 * @param {string} itemId
 * @returns {Object} updated VaultData
 */
export function deleteEntry(vaultData, itemId) {
  const items = vaultData.items.filter(item => item.itemId !== itemId);
  return { ...vaultData, items };
}

/**
 * Create an empty vault structure (for new users)
 * @returns {Object} empty VaultData
 */
export function createEmptyVault() {
  return { version: 1, items: [] };
}
