// ============================================================
//  SyncModule — Sync encrypted vault to server
// ============================================================

const API_BASE = 'http://localhost:3000/api';

/**
 * Upload encrypted vault ciphertext to server (PUT /api/vault)
 * Server stores blindly — Zero-Knowledge principle
 *
 * @param {string} ciphertext          — Base64 encoded ciphertext from encryptVault()
 * @param {string} sessionToken        — JWT bearer token
 * @param {{ newAuthHash: string, newSalt: string } | null} [changePasswordPayload]
 *   — When changing master password, include new auth hash + salt for server update
 * @returns {Promise<void>}
 * @throws {Error} on network or server error
 */
export async function syncVault(ciphertext, sessionToken, changePasswordPayload = null) {
  const body = { encryptedData: ciphertext };
  if (changePasswordPayload) {
    body.newAuthHash = changePasswordPayload.newAuthHash;
    body.newSalt     = changePasswordPayload.newSalt;
  }

  const response = await fetch(`${API_BASE}/vault`, {
    method:  'PUT',
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
      'Content-Type':  'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error('Không thể đồng bộ lên server: ' + (err.message || response.status));
  }
}
