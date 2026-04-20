import { useState, useEffect, useCallback } from 'react';

// — Business Logic modules —
import { authenticate, register, fetchVault, logout } from '../modules/auth.js';
import { deriveKey, decryptVault, encryptVault, exportKey, importKey } from '../modules/crypto.js';
import { addEntry, editEntry, deleteEntry } from '../modules/vault-manager.js';
import { syncVault } from '../modules/sync.js';

// — Views (8 màn hình) —
import LoginView      from './views/LoginView.jsx';
import RegisterView   from './views/RegisterView.jsx';
import VaultView      from './views/VaultView.jsx';
import AddEntryView   from './views/AddEntryView.jsx';
import EditEntryView  from './views/EditEntryView.jsx';
import GeneratorView  from './views/GeneratorView.jsx';
import SettingsView   from './views/SettingsView.jsx';
import QuickUnlockView from './views/QuickUnlockView.jsx';

// — Shared components —
import Toast from './components/Toast.jsx';

// — Hooks —
import { useToast } from './hooks/useToast.js';

// =========================================================
// View IDs — khớp với docs 06_SCREENS.md
// =========================================================
const VIEW = {
  LOGIN:        'login',
  REGISTER:     'register',
  VAULT:        'vault',
  ADD:          'add',
  EDIT:         'edit',
  GENERATOR:    'generator',
  SETTINGS:     'settings',
  QUICK_UNLOCK: 'quick-unlock',
};

// =========================================================
// App — Root component
// =========================================================
export default function App() {
  const [view, setView]           = useState(VIEW.LOGIN);
  const [loading, setLoading]     = useState(false);

  // Session state (serializable → chrome.storage.session)
  const [session, setSession] = useState({
    username:  '',
    userId:    '',
    token:     '',
    salt:      '',
  });

  // masterKey (CryptoKey — non-extractable, RAM only)
  const [masterKey,  setMasterKey]  = useState(null);
  const [vaultData,  setVaultData]  = useState({ version: 1, items: [] });

  // Context cho GeneratorView
  const [genTarget,        setGenTarget]        = useState(null);  // 'add' | 'edit' | null
  const [generatedPassword, setGeneratedPassword] = useState('');

  // Selected item cho EditEntryView
  const [selectedItem, setSelectedItem] = useState(null);

  // Toast notifications
  const { toast, showToast } = useToast();

  // -------------------------------------------------------
  // Khởi tạo: kiểm tra session trong chrome.storage
  // -------------------------------------------------------
  useEffect(() => {
    const init = async () => {
      try {
        const resp = await chrome.runtime.sendMessage({ type: 'GET_SESSION' });
        const saved = resp?.session;
        if (saved?.sessionToken && saved?.salt) {
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
              setView(VIEW.VAULT);
            } catch {
              setView(VIEW.QUICK_UNLOCK);
            }
          } else {
            // masterKey đã mất vì popup đóng → Quick Unlock
            setView(VIEW.QUICK_UNLOCK);
          }
        }
      } catch {
        // Không phải extension context (dev mode) — giữ màn hình login
      }
    };
    init();
  }, []);

  // -------------------------------------------------------
  // Helper: lưu session lên service worker
  // -------------------------------------------------------
  const persistSession = useCallback(async (s, vault, currentMasterKey) => {
    try {
      const payload = {
        username:     s.username,
        userId:       s.userId,
        sessionToken: s.token,
        salt:         s.salt,
        vaultData:    vault,
      };
      if (currentMasterKey) {
        payload.masterKeyBase64 = await exportKey(currentMasterKey);
      }
      
      await chrome.runtime.sendMessage({
        type: 'SET_SESSION',
        data: payload,
      });
    } catch {
      // Ignore ngoài extension context
    }
  }, []);

  // -------------------------------------------------------
  // Helper: encrypt + sync vault → update state
  // -------------------------------------------------------
  const encryptAndSync = useCallback(async (nextVaultData) => {
    if (!masterKey || !session.token) throw new Error('Phiên làm việc không hợp lệ');
    const ciphertext = await encryptVault(nextVaultData, masterKey);
    await syncVault(ciphertext, session.token);
    setVaultData(nextVaultData);
    await persistSession(session, nextVaultData, masterKey);
  }, [masterKey, session, persistSession]);

  // -------------------------------------------------------
  // S01 — Đăng nhập
  // -------------------------------------------------------
  const handleLogin = async ({ username, masterPassword }) => {
    setLoading(true);
    try {
      const auth    = await authenticate(username, masterPassword);
      const mk      = await deriveKey(masterPassword, auth.salt);
      const { encryptedData } = await fetchVault(auth.sessionToken);
      const decrypted = await decryptVault(encryptedData, mk);

      const s = { username, userId: auth.userId, token: auth.sessionToken, salt: auth.salt };
      setSession(s);
      setMasterKey(mk);
      setVaultData(decrypted);
      setView(VIEW.VAULT);
      await persistSession(s, decrypted, mk);
    } catch (e) {
      showToast(e?.message || 'Đăng nhập thất bại', 'error');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------
  // S02 — Đăng ký
  // -------------------------------------------------------
  const handleRegister = async ({ username, masterPassword }) => {
    setLoading(true);
    try {
      await register(username.trim(), masterPassword);
      showToast('Đăng ký thành công! Hãy đăng nhập.', 'success');
      setView(VIEW.LOGIN);
    } catch (e) {
      showToast(e?.message || 'Đăng ký thất bại', 'error');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------
  // S07 — Đăng xuất
  // -------------------------------------------------------
  const handleLogout = useCallback(async () => {
    try { await logout(session.token); } catch { /* ignore */ }
    setSession({ username: '', userId: '', token: '', salt: '' });
    setMasterKey(null);
    setVaultData({ version: 1, items: [] });
    setSelectedItem(null);
    setGenTarget(null);
    setGeneratedPassword('');
    showToast('Đã đăng xuất!', 'info');
    setView(VIEW.LOGIN);
  }, [showToast]);

  // -------------------------------------------------------
  // S08 — Quick Unlock
  // -------------------------------------------------------
  const handleQuickUnlockSuccess = useCallback((mk, vault) => {
    setMasterKey(mk);
    setVaultData(vault);
    setView(VIEW.VAULT);
    persistSession(session, vault, mk);
    showToast('Mở khóa thành công!', 'success');
  }, [showToast, session, persistSession]);

  // -------------------------------------------------------
  // S04 — Thêm mục mới
  // -------------------------------------------------------
  const handleAddEntry = async (payload) => {
    setLoading(true);
    try {
      const next = addEntry(vaultData, payload);
      await encryptAndSync(next);
      showToast('Đã thêm mục mới thành công!', 'success');
      setGeneratedPassword('');
      setView(VIEW.VAULT);
    } catch (e) {
      showToast(e?.message || 'Không thể thêm mục', 'error');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------
  // S05 — Chỉnh sửa mục
  // -------------------------------------------------------
  const handleEditEntry = async (itemId, updates) => {
    setLoading(true);
    try {
      const next = editEntry(vaultData, itemId, updates);
      await encryptAndSync(next);
      showToast('Đã cập nhật thành công!', 'success');
      setGeneratedPassword('');
      setSelectedItem(null);
      setView(VIEW.VAULT);
    } catch (e) {
      showToast(e?.message || 'Không thể cập nhật mục', 'error');
    } finally {
      setLoading(false);
    }
  };

  // S05 — Xóa mục
  const handleDeleteEntry = async (itemId) => {
    setLoading(true);
    try {
      const next = deleteEntry(vaultData, itemId);
      await encryptAndSync(next);
      showToast('Đã xóa mục!', 'success');
      setSelectedItem(null);
      setView(VIEW.VAULT);
    } catch (e) {
      showToast(e?.message || 'Không thể xóa mục', 'error');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------
  // S06 — Generator: nhận mật khẩu sinh được → về form
  // -------------------------------------------------------
  const handleGeneratorUse = useCallback((password, target) => {
    setGeneratedPassword(password);
    setView(target === 'edit' ? VIEW.EDIT : VIEW.ADD);
  }, []);

  // -------------------------------------------------------
  // S07 — Update master key sau khi đổi password
  // -------------------------------------------------------
  const handleMasterKeyUpdate = useCallback((newMk, newSalt) => {
    setMasterKey(newMk);
    setSession((s) => {
      const updatedS = { ...s, salt: newSalt };
      persistSession(updatedS, vaultData, newMk);
      return updatedS;
    });
    showToast('Đã đổi Master Password thành công!', 'success');
  }, [showToast, vaultData, persistSession]);

  // =========================================================
  // Render
  // =========================================================
  return (
    <div className="app-shell">

      {/* — S01: Đăng nhập — */}
      {view === VIEW.LOGIN && (
        <LoginView
          loading={loading}
          onLogin={handleLogin}
          onGoRegister={() => setView(VIEW.REGISTER)}
        />
      )}

      {/* — S02: Đăng ký — */}
      {view === VIEW.REGISTER && (
        <RegisterView
          isLoading={loading}
          onRegister={handleRegister}
          onGoLogin={() => setView(VIEW.LOGIN)}
        />
      )}

      {/* — S08: Quick Unlock — */}
      {view === VIEW.QUICK_UNLOCK && (
        <QuickUnlockView
          session={session}
          onSuccess={handleQuickUnlockSuccess}
          onSwitchToLogin={handleLogout}
        />
      )}

      {/* — S03: Danh sách Vault — */}
      {view === VIEW.VAULT && (
        <VaultView
          vaultData={vaultData}
          onGoAdd={() => { setGeneratedPassword(''); setView(VIEW.ADD); }}
          onGoEdit={(item) => { setSelectedItem(item); setView(VIEW.EDIT); }}
          onGoGenerator={() => { setGenTarget(null); setView(VIEW.GENERATOR); }}
          onGoSettings={() => setView(VIEW.SETTINGS)}
          onLogout={handleLogout}
        />
      )}

      {/* — S04: Thêm mục mới — */}
      {view === VIEW.ADD && (
        <AddEntryView
          generatedPassword={generatedPassword}
          loading={loading}
          onSave={handleAddEntry}
          onCancel={() => setView(VIEW.VAULT)}
          onGoGenerator={(target) => { setGenTarget(target); setView(VIEW.GENERATOR); }}
        />
      )}

      {/* — S05: Chỉnh sửa mục — */}
      {view === VIEW.EDIT && selectedItem && (
        <EditEntryView
          item={selectedItem}
          generatedPassword={generatedPassword}
          loading={loading}
          onSave={handleEditEntry}
          onDelete={handleDeleteEntry}
          onCancel={() => { setSelectedItem(null); setView(VIEW.VAULT); }}
          onGoGenerator={(target) => { setGenTarget(target); setView(VIEW.GENERATOR); }}
        />
      )}

      {/* — S06: Sinh mật khẩu — */}
      {view === VIEW.GENERATOR && (
        <GeneratorView
          genTarget={genTarget}
          onUse={handleGeneratorUse}
          onBack={() => setView(genTarget === 'edit' ? VIEW.EDIT : genTarget === 'add' ? VIEW.ADD : VIEW.VAULT)}
        />
      )}

      {/* — S07: Cài đặt — */}
      {view === VIEW.SETTINGS && (
        <SettingsView
          session={session}
          masterKey={masterKey}
          vaultData={vaultData}
          loading={loading}
          onLogout={handleLogout}
          onBack={() => setView(VIEW.VAULT)}
          onMasterKeyUpdate={handleMasterKeyUpdate}
        />
      )}

      {/* — Toast nổi — */}
      <Toast msg={toast?.msg} type={toast?.type} />
    </div>
  );
}
