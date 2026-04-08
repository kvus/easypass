import { describe, it, expect, beforeAll } from 'vitest';
import { deriveKey, computeAuthHash, encryptVault, decryptVault } from '../modules/crypto';

// Đảm bảo có global crypto cho test
import { webcrypto } from 'node:crypto';
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
}

describe('Crypto Module', () => {
  const masterPassword = "TestPassword@123";
  const saltHex = "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d"; // 16 bytes = 32 hex chars

  it('computes correct Auth Hash length', async () => {
    const hash = await computeAuthHash(masterPassword);
    expect(hash).toBeDefined();
    expect(hash.length).toBe(64); // SHA-256 = 32 bytes = 64 hex chars
    expect(typeof hash).toBe('string');
  });

  it('derives a MasterKey and can perform encryption/decryption round trip', async () => {
    // 1. Derive key
    const masterKey = await deriveKey(masterPassword, saltHex);
    expect(masterKey).toBeDefined();
    expect(masterKey.algorithm.name).toBe('AES-GCM');

    // 2. Encrypt vault
    const sampleVault = { items: [{ site: 'github.com', user: 'me' }] };
    const ciphertext = await encryptVault(sampleVault, masterKey);
    
    expect(ciphertext).toBeDefined();
    expect(typeof ciphertext).toBe('string');
    
    // 3. Decrypt vault
    const decryptedVault = await decryptVault(ciphertext, masterKey);
    
    expect(decryptedVault).toEqual(sampleVault);
  });

  it('fails decryption with tampered ciphertext', async () => {
    const masterKey = await deriveKey(masterPassword, saltHex);
    const sampleVault = { items: [{ site: 'google.com', user: 'dev' }] };
    let ciphertext = await encryptVault(sampleVault, masterKey);

    // Tamper with base64 string
    const tampered = ciphertext.substring(0, ciphertext.length - 2) + "AB";

    await expect(decryptVault(tampered, masterKey)).rejects.toThrow();
  });
});
