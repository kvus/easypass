import { useState } from 'react';

/**
 * PasswordInput — input mật khẩu với nút toggle hiện/ẩn
 * Props:
 *  - id: string
 *  - label: string
 *  - value: string
 *  - onChange: (value) => void
 *  - placeholder: string
 *  - disabled: boolean
 *  - required: boolean
 *  - autoComplete: string
 *  - error: string (thông báo lỗi inline)
 */
export default function PasswordInput({
  id,
  label,
  value,
  onChange,
  placeholder = '••••••••',
  disabled = false,
  required = false,
  autoComplete,
  error = ''
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="form-group">
      {label && <label htmlFor={id}>{label}</label>}
      <div className="password-wrapper">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          className="toggle-pw"
          aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          onClick={() => setShow((v) => !v)}
          disabled={disabled}
          tabIndex={-1}
        >
          {show ? '🙈' : '👁'}
        </button>
      </div>
      {error && <div className="msg-error">{error}</div>}
    </div>
  );
}
