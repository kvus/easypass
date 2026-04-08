import { useCallback } from 'react';
import {
  addEntry as _addEntry,
  editEntry as _editEntry,
  deleteEntry as _deleteEntry
} from '../../modules/vault-manager.js';
import { encryptVault } from '../../modules/crypto.js';
import { syncVault } from '../../modules/sync.js';

/**
 * useVault — quản lý vaultData state + CRUD + encryptAndSync
 * @param {object} params
 * @param {object} params.vaultData - Dữ liệu vault hiện tại (trong RAM)
 * @param {CryptoKey} params.masterKey - Khóa AES-256 (non-extractable)
 * @param {object} params.session - { token, username, userId, salt }
 * @param {Function} params.onVaultUpdate - Callback khi vaultData thay đổi
 * @param {Function} params.onSaveSession - Callback lưu session mới lên service worker
 */
export function useVault({ vaultData, masterKey, session, onVaultUpdate, onSaveSession }) {
  const encryptAndSync = useCallback(
    async (nextVaultData) => {
      if (!masterKey || !session?.token) {
        throw new Error('Phiên làm việc không hợp lệ');
      }
      const ciphertext = await encryptVault(nextVaultData, masterKey);
      await syncVault(ciphertext, session.token);
      onVaultUpdate(nextVaultData);
      if (onSaveSession) {
        await onSaveSession({
          username: session.username,
          userId: session.userId,
          sessionToken: session.token,
          salt: session.salt,
          vaultData: nextVaultData
        });
      }
    },
    [masterKey, session, onVaultUpdate, onSaveSession]
  );

  const addEntry = useCallback(
    async (newItem) => {
      const next = _addEntry(vaultData, newItem);
      await encryptAndSync(next);
      return next;
    },
    [vaultData, encryptAndSync]
  );

  const editEntry = useCallback(
    async (itemId, updates) => {
      const next = _editEntry(vaultData, itemId, updates);
      await encryptAndSync(next);
      return next;
    },
    [vaultData, encryptAndSync]
  );

  const deleteEntry = useCallback(
    async (itemId) => {
      const next = _deleteEntry(vaultData, itemId);
      await encryptAndSync(next);
      return next;
    },
    [vaultData, encryptAndSync]
  );

  return { addEntry, editEntry, deleteEntry, encryptAndSync };
}
