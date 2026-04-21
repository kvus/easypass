import { useState, useCallback } from 'react';

// — Hooks —
import { useToast }   from './hooks/useToast.js';
import { useAuth }    from './hooks/useAuth.js';
import { useVault }   from './hooks/useVault.js';

// — Views —
import LoginView       from './views/LoginView.jsx';
import RegisterView    from './views/RegisterView.jsx';
import VaultView       from './views/VaultView.jsx';
import AddEntryView    from './views/AddEntryView.jsx';
import EditEntryView   from './views/EditEntryView.jsx';
import GeneratorView   from './views/GeneratorView.jsx';
import SettingsView    from './views/SettingsView.jsx';
import QuickUnlockView from './views/QuickUnlockView.jsx';

// — Shared components —
import Toast from './components/Toast.jsx';

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

export default function App() {
  const [view,              setView]              = useState(VIEW.LOGIN);
  const [loading,           setLoading]           = useState(false);
  const [genTarget,         setGenTarget]         = useState(null);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [selectedItem,      setSelectedItem]      = useState(null);
  const [expiredUsername,   setExpiredUsername]   = useState('');

  const { toast, showToast } = useToast();

  // — Auth state + handlers —
  const {
    session, masterKey, vaultData, setVaultData,
    loading: authLoading, persistSession,
    handleLogin, handleRegister, handleLogout,
    handleQuickUnlockSuccess, handleMasterKeyUpdate,
  } = useAuth({ showToast, onViewChange: setView, onSessionExpired: setExpiredUsername });

  // — Vault CRUD + encrypt + sync —
  const vault = useVault({
    vaultData,
    masterKey,
    session,
    onVaultUpdate: setVaultData,
    onSaveSession: (payload) =>
      persistSession(
        { username: payload.username, userId: payload.userId, token: payload.sessionToken, salt: payload.salt },
        payload.vaultData,
        masterKey
      ),
  });

  // -------------------------------------------------------
  // Vault handlers — UI transitions after CRUD
  // -------------------------------------------------------
  const handleAddEntry = async (payload) => {
    setLoading(true);
    try {
      await vault.addEntry(payload);
      showToast('Đã thêm mục mới thành công!', 'success');
      setGeneratedPassword('');
      setView(VIEW.VAULT);
    } catch (e) {
      showToast(e?.message || 'Không thể thêm mục', 'error');
    } finally { setLoading(false); }
  };

  const handleEditEntry = async (itemId, updates) => {
    setLoading(true);
    try {
      await vault.editEntry(itemId, updates);
      showToast('Đã cập nhật thành công!', 'success');
      setGeneratedPassword('');
      setSelectedItem(null);
      setView(VIEW.VAULT);
    } catch (e) {
      showToast(e?.message || 'Không thể cập nhật mục', 'error');
    } finally { setLoading(false); }
  };

  const handleDeleteEntry = async (itemId) => {
    setLoading(true);
    try {
      await vault.deleteEntry(itemId);
      showToast('Đã xóa mục!', 'success');
      setSelectedItem(null);
      setView(VIEW.VAULT);
    } catch (e) {
      showToast(e?.message || 'Không thể xóa mục', 'error');
    } finally { setLoading(false); }
  };

  const handleGeneratorUse = useCallback((password, target) => {
    setGeneratedPassword(password);
    setView(target === 'edit' ? VIEW.EDIT : VIEW.ADD);
  }, []);

  const isLoading = loading || authLoading;

  // =========================================================
  // Render
  // =========================================================
  return (
    <div className="app-shell">
      {view === VIEW.LOGIN && (
        <LoginView
          loading={isLoading}
          onLogin={handleLogin}
          onGoRegister={() => { setExpiredUsername(''); setView(VIEW.REGISTER); }}
          initialUsername={expiredUsername}
        />
      )}

      {view === VIEW.REGISTER && (
        <RegisterView
          isLoading={isLoading}
          onRegister={handleRegister}
          onGoLogin={() => setView(VIEW.LOGIN)}
        />
      )}

      {view === VIEW.QUICK_UNLOCK && (
        <QuickUnlockView
          session={session}
          onSuccess={handleQuickUnlockSuccess}
          onSwitchToLogin={handleLogout}
        />
      )}

      {view === VIEW.VAULT && (
        <VaultView
          vaultData={vaultData}
          onGoAdd={() => { setGeneratedPassword(''); setView(VIEW.ADD); }}
          onGoEdit={(item) => { setSelectedItem(item); setGeneratedPassword(''); setView(VIEW.EDIT); }}
          onGoGenerator={() => { setGenTarget(null); setView(VIEW.GENERATOR); }}
          onGoSettings={() => setView(VIEW.SETTINGS)}
          onLogout={handleLogout}
        />
      )}

      {(view === VIEW.ADD || (view === VIEW.GENERATOR && genTarget === 'add')) && (
        <div style={view !== VIEW.ADD ? { display: 'none' } : undefined}>
          <AddEntryView
            generatedPassword={generatedPassword}
            loading={isLoading}
            onSave={handleAddEntry}
            onCancel={() => setView(VIEW.VAULT)}
            onGoGenerator={(target) => { setGenTarget(target); setView(VIEW.GENERATOR); }}
          />
        </div>
      )}

      {(view === VIEW.EDIT || (view === VIEW.GENERATOR && genTarget === 'edit')) && selectedItem && (
        <div style={view !== VIEW.EDIT ? { display: 'none' } : undefined}>
          <EditEntryView
            item={selectedItem}
            generatedPassword={generatedPassword}
            loading={isLoading}
            onSave={handleEditEntry}
            onDelete={handleDeleteEntry}
            onCancel={() => { setSelectedItem(null); setView(VIEW.VAULT); }}
            onGoGenerator={(target) => { setGenTarget(target); setView(VIEW.GENERATOR); }}
          />
        </div>
      )}

      {view === VIEW.GENERATOR && (
        <GeneratorView
          genTarget={genTarget}
          onUse={handleGeneratorUse}
          onBack={() => setView(genTarget === 'edit' ? VIEW.EDIT : genTarget === 'add' ? VIEW.ADD : VIEW.VAULT)}
        />
      )}

      {view === VIEW.SETTINGS && (
        <SettingsView
          session={session}
          masterKey={masterKey}
          vaultData={vaultData}
          loading={isLoading}
          onLogout={handleLogout}
          onBack={() => setView(VIEW.VAULT)}
          onMasterKeyUpdate={handleMasterKeyUpdate}
        />
      )}

      <Toast msg={toast?.msg} type={toast?.type} />
    </div>
  );
}
