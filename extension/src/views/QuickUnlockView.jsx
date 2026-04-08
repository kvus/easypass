import { useState } from 'react';
import PasswordInput from '../components/PasswordInput.jsx';
import { fetchVault } from '../../modules/auth.js';
import { deriveKey, decryptVault } from '../../modules/crypto.js';

/**
 * QuickUnlockView — S08: Mở khóa nhanh khi popup mở lại
 * Session vẫn còn nhưng masterKey đã mất vì popup đóng
 * Props:
 *  - session: { username, userId, token, salt }
 *  - onSuccess: (masterKey, vaultData) => void
 *  - onSwitchToLogin: () => void — đăng xuất và đăng nhập lại
 */
export default function QuickUnlockView({ session, onSuccess, onSwitchToLogin }) {
  const [masterPassword, setMasterPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUnlock = async (e) => {
    e.preventDefault();
    setError('');

    if (!masterPassword) {
      setError('Vui lòng nhập Master Password.');
      return;
    }

    setLoading(true);
    try {
      // 1. Lấy vault mới nhất từ server
      const { encryptedData } = await fetchVault(session.token);

      // 2. Dẫn xuất lại master key
      const mk = await deriveKey(masterPassword, session.salt);

      // 3. Giải mã vault — GCM tag sẽ fail nếu sai password
      const vaultData = await decryptVault(encryptedData, mk);

      // 4. Thành công
      onSuccess(mk, vaultData);
    } catch (err) {
      if (err?.message?.toLowerCase().includes('decrypt') || err?.message?.includes('tag')) {
        setError('Sai Master Password. Vui lòng thử lại.');
      } else if (err?.message?.includes('401') || err?.message?.includes('hết hạn')) {
        setError('Phiên đã hết hạn. Vui lòng đăng nhập lại.');
      } else {
        setError(err?.message || 'Mở khóa thất bại.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="view auth-view active">
      <div className="auth-brand">
        <span className="brand-icon">🔒</span>
        <h1>EasyPass</h1>
        <p>Phiên làm việc vẫn còn hiệu lực</p>
      </div>

      <div className="quick-unlock-info">
        <span className="quick-unlock-user">👤 {session?.username || '—'}</span>
        <p className="quick-unlock-hint">
          Nhập Master Password để tiếp tục mà không cần đăng nhập lại.
        </p>
      </div>

      <form className="auth-form" onSubmit={handleUnlock} autoComplete="off">
        <PasswordInput
          id="quick-unlock-password"
          label="Master Password"
          value={masterPassword}
          onChange={setMasterPassword}
          placeholder="••••••••"
          disabled={loading}
          required
        />

        {error && <div className="msg-error">{error}</div>}

        <button
          type="submit"
          className="btn btn-primary btn-full"
          id="btn-quick-unlock"
          disabled={loading}
        >
          {loading ? 'Đang mở khóa (~1 giây)...' : '🔓 Mở khóa'}
        </button>
      </form>

      <div className="auth-footer" style={{ marginTop: 24, padding: '0 24px' }}>
        <button
          type="button"
          className="btn btn-secondary btn-full"
          onClick={onSwitchToLogin}
          disabled={loading}
        >
          🔑 Sử dụng tài khoản khác
        </button>
        <p className="text-center" style={{ marginTop: 12, fontSize: '0.85rem', color: '#888' }}>
          Đăng xuất và đăng nhập lại từ đầu.
        </p>
      </div>
    </div>
  );
}
