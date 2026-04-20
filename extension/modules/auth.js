// ============================================================
//  AuthModule — Server communication for authentication
//  Implements: authenticate(), register(), fetchVault(), logout()
// ============================================================

import { computeAuthHash } from './crypto.js';

const API_BASE = 'http://localhost:3000/api';

/**
 * Authenticate user against server
 * Flow: SHA-256(MP) → POST /api/login → JWT + salt
 *
 * @param {string} username
 * @param {string} masterPassword
 * @returns {Promise<{sessionToken, salt, userId}>}
 */
export async function authenticate(username, masterPassword) {
  const authHash = await computeAuthHash(masterPassword);

  let response;
  try {
    response = await fetch(`${API_BASE}/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ username, authHash })
    });
  } catch {
    throw new Error('Không thể kết nối server. Vui lòng kiểm tra kết nối mạng.');
  }

  const data = await response.json().catch(() => ({}));
  if (response.ok) {
    return { sessionToken: data.token, salt: data.salt, userId: data.userId };
  }
  throw new Error(data.message || 'Đăng nhập thất bại');
}

/**
 * Register a new account
 * Server receives only SHA-256(MP), never the password itself
 *
 * @param {string} username
 * @param {string} masterPassword
 * @returns {Promise<{userId}>}
 */
export async function register(username, masterPassword) {
  const authHash = await computeAuthHash(masterPassword);

  let response;
  try {
    response = await fetch(`${API_BASE}/register`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ username, authHash })
    });
  } catch {
    throw new Error('Không thể kết nối server. Vui lòng kiểm tra kết nối mạng.');
  }

  const data = await response.json().catch(() => ({}));
  if (response.ok) {
    return data;
  }
  throw new Error(data.message || 'Đăng ký thất bại');
}

/**
 * Fetch encrypted vault from server
 * Returns ciphertext as-is — decryption happens client-side only
 *
 * @param {string} sessionToken — JWT
 * @returns {Promise<{encryptedData: string}>}
 */
export async function fetchVault(sessionToken) {
  let response;
  try {
    response = await fetch(`${API_BASE}/vault`, {
      method:  'GET',
      headers: { 'Authorization': `Bearer ${sessionToken}` }
    });
  } catch {
    throw new Error('Không thể kết nối server. Vui lòng kiểm tra kết nối mạng.');
  }

  const data = await response.json().catch(() => ({}));
  if (response.ok) {
    return { encryptedData: data.encryptedData };
  }
  throw new Error(data.message || 'Không thể tải Vault từ server');
}

/**
 * Logout: revoke JWT on server, then clear local session
 * @param {string} [sessionToken] — JWT to revoke; if absent, only clears locally
 */
export async function logout(sessionToken) {
  if (sessionToken) {
    try {
      await fetch(`${API_BASE}/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });
    } catch {
      // Server-side revocation failed — still clear local session
    }
  }
  return chrome.runtime.sendMessage({ type: 'CLEAR_SESSION' });
}
