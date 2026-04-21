import { useState, useEffect, useCallback } from 'react';
import { authenticate, register as registerUser, fetchVault, logout } from '../../modules/auth.js';
import { deriveKey, decryptVault, exportKey, importKey } from '../../modules/crypto.js';

function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
}

/**
 * useAuth — manages session/masterKey/vaultData state + all auth handlers
 * @param {{ showToast: Function, onViewChange: Function }} params
 */
export function useAuth({ showToast, onViewChange, onSessionExpired }) {
  const [session,    setSession]    = useState({ username: '', userId: '', token: '', salt: '' });
  const [masterKey,  setMasterKey]  = useState(null);
  const [vaultData,  setVaultData]  = useState({ version: 1, items: [] });
  const [loading,    setLoading]    = useState(false);

  // Persist session to service worker (chrome.storage.session)
  const persistSession = useCallback(async (s, vault, mk) => {
    try {
      const payload = {
        username:     s.username,
        userId:       s.userId,
        sessionToken: s.token,
        salt:         s.salt,
        vaultData:    vault,
      };
      if (mk) payload.masterKeyBase64 = await exportKey(mk);
      await chrome.runtime.sendMessage({ type: 'SET_SESSION', data: payload });
    } catch { /* ignore outside extension context */ }
  }, []);

  // Restore session on popup open
  useEffect(() => {
    const init = async () => {
      try {
        const resp  = await chrome.runtime.sendMessage({ type: 'GET_SESSION' });
        const saved = resp?.session;
        if (!saved?.sessionToken || !saved?.salt) return;

        if (isTokenExpired(saved.sessionToken)) {
          await chrome.runtime.sendMessage({ type: 'CLEAR_SESSION' });
          onSessionExpired?.(saved.username || '');
          showToast('Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.', 'info');
          onViewChange('login');
          return;
        }

        setSession({
          username: saved.username || '',
          userId:   saved.userId   || '',
          token:    saved.sessionToken,
          salt:     saved.salt,
        });

        if (saved.masterKeyBase64) {
          try {
            const mk = await importKey(saved.masterKeyBase64);
            setMasterKey(mk);
            setVaultData(saved.vaultData || { version: 1, items: [] });
            onViewChange('vault');
          } catch {
            onViewChange('quick-unlock');
          }
        } else {
          onViewChange('quick-unlock');
        }
      } catch { /* dev mode — no chrome API */ }
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogin = async ({ username, masterPassword }) => {
    setLoading(true);
    try {
      const auth          = await authenticate(username, masterPassword);
      const mk            = await deriveKey(masterPassword, auth.salt);
      const { encryptedData } = await fetchVault(auth.sessionToken);
      const decrypted     = await decryptVault(encryptedData, mk);
      const s             = { username, userId: auth.userId, token: auth.sessionToken, salt: auth.salt };
      setSession(s); setMasterKey(mk); setVaultData(decrypted);
      onViewChange('vault');
      await persistSession(s, decrypted, mk);
    } catch (e) {
      showToast(e?.message || 'Đăng nhập thất bại', 'error');
    } finally { setLoading(false); }
  };

  const handleRegister = async ({ username, masterPassword }) => {
    setLoading(true);
    try {
      await registerUser(username.trim(), masterPassword);
      showToast('Đăng ký thành công! Hãy đăng nhập.', 'success');
      onViewChange('login');
    } catch (e) {
      showToast(e?.message || 'Đăng ký thất bại', 'error');
    } finally { setLoading(false); }
  };

  const handleLogout = useCallback(async () => {
    try { await logout(session.token); } catch { /* ignore */ }
    setSession({ username: '', userId: '', token: '', salt: '' });
    setMasterKey(null);
    setVaultData({ version: 1, items: [] });
    showToast('Đã đăng xuất!', 'info');
    onViewChange('login');
  }, [session.token, showToast, onViewChange]);

  const handleQuickUnlockSuccess = useCallback((mk, vault) => {
    setMasterKey(mk);
    setVaultData(vault);
    onViewChange('vault');
    persistSession(session, vault, mk);
    showToast('Mở khóa thành công!', 'success');
  }, [session, persistSession, showToast, onViewChange]);

  const handleMasterKeyUpdate = useCallback((newMk, newSalt) => {
    setMasterKey(newMk);
    setSession(s => {
      const updated = { ...s, salt: newSalt };
      persistSession(updated, vaultData, newMk);
      return updated;
    });
    showToast('Đã đổi Master Password thành công!', 'success');
  }, [vaultData, persistSession, showToast]);

  return {
    session, masterKey, vaultData, setVaultData, loading,
    persistSession,
    handleLogin, handleRegister, handleLogout,
    handleQuickUnlockSuccess, handleMasterKeyUpdate,
  };
}
