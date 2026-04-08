import { useState } from 'react';
import PasswordInput from '../components/PasswordInput.jsx';
import { formatDate } from '../../modules/utils.js';
import { authenticate } from '../../modules/auth.js';
import { deriveKey, encryptVault, computeAuthHash } from '../../modules/crypto.js';
import { syncVault } from '../../modules/sync.js';


/**
 * SettingsView — S07: Cài đặt tài khoản
 * Props:
 *  - session: { username, userId, token, salt, createdAt? }
 *  - masterKey: CryptoKey
 *  - vaultData: object
 *  - onLogout: () => void
 *  - onBack: () => void
 *  - onMasterKeyUpdate: (newMasterKey, newSalt) => void
 *  - loading: boolean
 */
export default function SettingsView({
  session,
  masterKey,
  vaultData,
  onLogout,
  onBack,
  onMasterKeyUpdate,
  loading = false
}) {
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [cpError, setCpError] = useState('');
  const [cpLoading, setCpLoading] = useState(false);
  const [cpSuccess, setCpSuccess] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setCpError('');
    setCpSuccess(false);

    if (newPw.length < 8) {
      setCpError('Master Password mới phải có ít nhất 8 ký tự.');
      return;
    }
    if (newPw !== confirmPw) {
      setCpError('Xác nhận mật khẩu mới không khớp.');
      return;
    }

    setCpLoading(true);
    try {
      // 1. Xác minh old password
      await authenticate(session.username, oldPw);

      // 2. Tạo salt mới (server sẽ lưu salt mới)
      const saltBytes = crypto.getRandomValues(new Uint8Array(16));
      const newSaltHex = Array.from(saltBytes).map((b) => b.toString(16).padStart(2, '0')).join('');

      // 3. Dẫn xuất master key mới
      const newMasterKey = await deriveKey(newPw, newSaltHex);

      // 4. Mã hóa lại vault với key mới
      const newCiphertext = await encryptVault(vaultData, newMasterKey);

      // 5. Tính auth hash mới
      const newAuthHash = await computeAuthHash(newPw);

      // 6. Gửi lên server
      const res = await fetch('/api/vault', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`
        },
        body: JSON.stringify({
          encryptedData: newCiphertext,
          newAuthHash,
          newSalt: newSaltHex
        })
      });

      if (!res.ok) throw new Error('Không thể cập nhật lên server.');

      // 7. Cập nhật state
      if (onMasterKeyUpdate) onMasterKeyUpdate(newMasterKey, newSaltHex);

      setCpSuccess(true);
      setOldPw('');
      setNewPw('');
      setConfirmPw('');
      setTimeout(() => {
        setShowChangePassword(false);
        setCpSuccess(false);
      }, 1800);
    } catch (err) {
      if (err?.message?.includes('401') || err?.message?.toLowerCase().includes('sai')) {
        setCpError('Mật khẩu cũ không đúng.');
      } else {
        setCpError(err?.message || 'Đổi mật khẩu thất bại.');
      }
    } finally {
      setCpLoading(false);
    }
  };

  return (
    <div className="view scroll-view">
      <div className="view-header">
        <button type="button" className="icon-btn" onClick={onBack} title="Quay lại">
          ←
        </button>
        <h2 className="view-title">Cài đặt</h2>
        <div />
      </div>

      {/* Account info */}
      <div className="settings-card">
        <div className="settings-avatar">
          <span>{(session?.username?.[0] || '?').toUpperCase()}</span>
        </div>
        <div className="settings-info">
          <div className="settings-username">{session?.username || '—'}</div>
          {session?.createdAt && (
            <div className="settings-date">Tham gia: {formatDate(session.createdAt)}</div>
          )}
        </div>
      </div>

      {/* Change password */}
      {!showChangePassword ? (
        <button
          type="button"
          className="btn btn-secondary btn-full mt-12"
          onClick={() => setShowChangePassword(true)}
          disabled={loading}
        >
          🔑 Đổi Master Password
        </button>
      ) : (
        <form className="form settings-change-pw" onSubmit={handleChangePassword} autoComplete="off">
          <div className="form-group-title">Đổi Master Password</div>

          <PasswordInput
            id="old-pw"
            label="Master Password hiện tại"
            value={oldPw}
            onChange={setOldPw}
            placeholder="••••••••"
            disabled={cpLoading}
            required
          />
          <PasswordInput
            id="new-pw"
            label="Master Password mới (≥ 8 ký tự)"
            value={newPw}
            onChange={setNewPw}
            placeholder="••••••••"
            disabled={cpLoading}
            required
          />
          <PasswordInput
            id="confirm-pw"
            label="Xác nhận Master Password mới"
            value={confirmPw}
            onChange={setConfirmPw}
            placeholder="••••••••"
            disabled={cpLoading}
            required
          />

          {cpError && <div className="msg-error">{cpError}</div>}
          {cpSuccess && <div className="msg-success">✅ Đổi mật khẩu thành công!</div>}

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setShowChangePassword(false);
                setCpError('');
                setOldPw('');
                setNewPw('');
                setConfirmPw('');
              }}
              disabled={cpLoading}
            >
              Hủy
            </button>
            <button type="submit" className="btn btn-primary" disabled={cpLoading}>
              {cpLoading ? 'Đang đổi...' : 'Xác nhận'}
            </button>
          </div>
        </form>
      )}

      {/* Logout */}
      <div className="settings-danger">
        <button
          type="button"
          className="btn btn-danger btn-full"
          onClick={onLogout}
          disabled={loading}
          id="btn-logout"
        >
          ↩ Đăng xuất
        </button>
      </div>
    </div>
  );
}
