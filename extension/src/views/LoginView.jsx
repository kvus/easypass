import { useState } from 'react';

export default function LoginView({
  onLogin,
  onGoRegister,
  loading = false,
  initialUsername = ''
}) {
  const [username, setUsername] = useState(initialUsername);
  const [masterPassword, setMasterPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const normalizedUsername = username.trim();

    if (!normalizedUsername) {
      setError('Vui lòng nhập tên đăng nhập.');
      return;
    }

    if (!masterPassword) {
      setError('Vui lòng nhập Master Password.');
      return;
    }

    try {
      await onLogin?.({
        username: normalizedUsername,
        masterPassword
      });
    } catch (err) {
      setError(err?.message || 'Đăng nhập thất bại.');
    }
  };

  return (
    <div className="view auth-view active">
      <div className="auth-brand">
        <span className="brand-icon">🔐</span>
        <h1>EasyPass</h1>
        <p>Quản lý mật khẩu Zero-Knowledge</p>
      </div>

      <form className="auth-form" autoComplete="off" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="login-username">Tên đăng nhập</label>
          <input
            id="login-username"
            type="text"
            placeholder="your_username"
            required
            disabled={loading}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="login-password">Master Password</label>
          <div className="password-wrapper">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••••"
              required
              disabled={loading}
              value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
            />
            <button
              type="button"
              className="toggle-pw"
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              onClick={() => setShowPassword((prev) => !prev)}
              disabled={loading}
            >
              {showPassword ? '🙈' : '👁'}
            </button>
          </div>
        </div>

        {error ? <div className="msg-error">{error}</div> : null}

        <button
          type="submit"
          className="btn btn-primary btn-full"
          id="btn-login"
          disabled={loading}
        >
          <span>{loading ? 'Đang đăng nhập...' : 'Đăng nhập'}</span>
        </button>
      </form>

      <div className="divider">hoặc</div>

      <div className="text-center">
        <span className="text-sm">Chưa có tài khoản? </span>
        <button
          type="button"
          className="link-btn"
          onClick={onGoRegister}
          disabled={loading}
        >
          Đăng ký ngay
        </button>
      </div>
    </div>
  );
}
