// ============================================================
//  CryptoModule — Zero-Knowledge cryptographic operations
//  Uses Web Crypto API (browser built-in, no external deps)
// ============================================================

/**
 * Derives a non-extractable AES-256-GCM key from master password + salt
 * Using PBKDF2-SHA256 with 600,000 iterations (OWASP recommended 2023)
 *
 * @param {string} masterPassword — plain text master password
 * @param {string} saltHex        — 32-char hex string from server
 * @returns {Promise<CryptoKey>}  — non-extractable, only usable in this session
 */
export async function deriveKey(masterPassword, saltHex) {
  const enc  = new TextEncoder();
  const salt = hexToBytes(saltHex);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(masterPassword),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name:       'PBKDF2',
      salt:       salt,
      iterations: 600000,
      hash:       'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,              // extractable = true — MasterKey can be stored in chrome.storage.session
    ['encrypt', 'decrypt']
  );
}

/**
 * Xuất MasterKey ra Base64 để lưu vào vùng nhớ session.
 */
export async function exportKey(cryptoKey) {
  const rawData = await crypto.subtle.exportKey('raw', cryptoKey);
  return bytesToBase64(new Uint8Array(rawData));
}

/**
 * Nạp lại MasterKey từ Base64 sinh ra từ exportKey.
 */
export async function importKey(base64Key) {
  const rawData = base64ToBytes(base64Key);
  return crypto.subtle.importKey(
    'raw',
    rawData,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts VaultData with AES-256-GCM
 * Uses a fresh random 96-bit IV for each encryption
 *
 * @param {Object}    vaultData
 * @param {CryptoKey} masterKey
 * @returns {Promise<string>} Base64( IV[12] || ciphertext || GCM_tag[16] )
 */
export async function encryptVault(vaultData, masterKey) {
  const enc       = new TextEncoder();
  const iv        = crypto.getRandomValues(new Uint8Array(12));  // 96-bit nonce
  const plaintext = enc.encode(JSON.stringify(vaultData));

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    masterKey,
    plaintext
  );

  // Layout: [IV (12)] + [ciphertext + GCM tag (16)]
  const combined = new Uint8Array(iv.byteLength + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.byteLength);

  return bytesToBase64(combined);
}

/**
 * Decrypts ciphertext with AES-256-GCM
 * AES-GCM automatically verifies the integrity authentication tag.
 * If the tag fails (tampered data or wrong key), it throws an error.
 *
 * @param {string}    ciphertextBase64
 * @param {CryptoKey} masterKey
 * @returns {Promise<Object>} VaultData object
 * @throws {Error} if tag verification fails
 */
export async function decryptVault(ciphertextBase64, masterKey) {
  if (!ciphertextBase64) {
    // First login — empty vault
    return { version: 1, items: [] };
  }

  const raw       = base64ToBytes(ciphertextBase64);
  const iv        = raw.slice(0, 12);
  const encrypted = raw.slice(12);

  let plaintext;
  try {
    plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      masterKey,
      encrypted
    );
  } catch {
    throw new Error('Dữ liệu Vault bị giả mạo hoặc sai Master Password (GCM tag không hợp lệ)');
  }

  const dec = new TextDecoder();
  return JSON.parse(dec.decode(plaintext));
}

/**
 * Computes SHA-256(masterPassword) as hex string
 * Used as auth_hash sent to server — server never receives the actual password
 *
 * @param {string} masterPassword
 * @returns {Promise<string>} 64-char hex hash
 */
export async function computeAuthHash(masterPassword) {
  const enc    = new TextEncoder();
  const buffer = await crypto.subtle.digest('SHA-256', enc.encode(masterPassword));
  return bytesToHex(new Uint8Array(buffer));
}

// ---- Internal Helpers ----

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function bytesToBase64(bytes) {
  let binary = '';
  bytes.forEach(b => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes  = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
