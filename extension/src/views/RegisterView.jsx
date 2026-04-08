import { useState } from 'react';

export default function RegisterView({
  onRegister,
  onGoLogin,
  isLoading = false,
  initialUsername = '',
}) {
  const [username, setUsername] = useState(initialUsername);
  const [masterPassword, setMasterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [showMaster, setShowMaster] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const validate = () => {
    const trimmed = username.trim();
    if (!trimmed) return 'Vui lòng nhập tên đăng nhập.';
    if (!/^[A-Za-z0-9_.-]{3,50}$/.test(trimmed)) {
      return 'Tên đăng nhập chỉ gồm chữ, số, _, -, . và dài 3-50 ký tự.';
    }
    if (!masterPassword || masterPassword.length < 8) {
      return 'Master Password phải có ít nhất 8 ký tự.';
    }
    if (masterPassword !== confirmPassword) {
      return 'Xác nhận Master Password không khớp.';
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    const message = validate();
    if (message) {
      setError(message);
      return;
    }

    setError('');
    try {
      await onRegister?.({
        username: username.trim(),
        masterPassword,
      });
    } catch (err) {
      setError(err?.message || 'Đăng ký thất bại.');
    }
  };

  return (
    <div className="view auth-view active">
      <div className="auth-brand">
        <span className="brand-icon" aria-hidden="true">
          ✨
        </span>
        <h1>Tạo tài khoản</h1>
        <p>Mật khẩu của bạn — chỉ bạn mới biết</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit} autoComplete="off">
        <div className="form-group">
          <label htmlFor="reg-username">Tên đăng nhập</label>
          <input
            id="reg-username"
            type="text"
            placeholder="chỉ chữ, số, _ - ."
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isLoading}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="reg-password">Master Password</label>
          <div className="password-wrapper">
            <input
              id="reg-password"
              type={showMaster ? 'text' : 'password'}
              placeholder="Tối thiểu 8 ký tự"
              value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
              disabled={isLoading}
              required
            />
            <button
              type="button"
              className="toggle-pw"
              onClick={() => setShowMaster((v) => !v)}
              aria-label={showMaster ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              disabled={isLoading}
            >
              {showMaster ? '🙈' : '👁'}
            </button>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="reg-confirm">Xác nhận Master Password</label>
          <div className="password-wrapper">
            <input
              id="reg-confirm"
              type={showConfirm ? 'text' : 'password'}
              placeholder="Nhập lại mật khẩu"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              required
            />
            <button
              type="button"
              className="toggle-pw"
              onClick={() => setShowConfirm((v) => !v)}
              aria-label={showConfirm ? 'Ẩn mật khẩu xác nhận' : 'Hiện mật khẩu xác nhận'}
              disabled={isLoading}
            >
              {showConfirm ? '🙈' : '👁'}
            </button>
          </div>
        </div>

        {error ? <div className="msg-error">{error}</div> : null}

        <div className="msg-info">
          ⚠️ Master Password không thể khôi phục nếu quên. Hãy ghi nhớ hoặc lưu ở nơi an toàn.
        </div>

        <button type="submit" className="btn btn-primary btn-full" disabled={isLoading}>
          <span>{isLoading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}</span>
        </button>
      </form>

      <div className="text-center mt-4">
        <button type="button" className="link-btn" onClick={onGoLogin} disabled={isLoading}>
          ← Quay lại đăng nhập
        </button>
      </div>
    </div>
  );
}
