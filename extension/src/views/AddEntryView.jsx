import { useState } from 'react';
import PasswordInput from '../components/PasswordInput.jsx';
import PasswordStrengthBar from '../components/PasswordStrengthBar.jsx';
import { assessStrength, generatePassword, CATEGORIES } from '../../modules/utils.js';

const EMPTY_FORM = {
  siteName: '',
  siteUrl: '',
  username: '',
  password: '',
  category: 'other',
  notes: ''
};

/**
 * AddEntryView — S04: Form thêm mục mới vào vault
 * Props:
 *  - onSave: (payload) => Promise<void>
 *  - onCancel: () => void
 *  - onGoGenerator: (target) => void — mở màn hình sinh mật khẩu
 *  - generatedPassword: string — mật khẩu được sinh từ GeneratorView
 *  - loading: boolean
 */
export default function AddEntryView({
  onSave,
  onCancel,
  onGoGenerator,
  generatedPassword = '',
  loading = false
}) {
  const [form, setForm] = useState({
    ...EMPTY_FORM,
    password: generatedPassword
  });
  const [error, setError] = useState('');

  const strength = form.password ? assessStrength(form.password) : null;

  const set = (field) => (value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.siteName.trim()) {
      setError('Tên trang web là bắt buộc.');
      return;
    }
    if (!form.username.trim()) {
      setError('Username / Email là bắt buộc.');
      return;
    }
    if (!form.password) {
      setError('Mật khẩu là bắt buộc.');
      return;
    }

    try {
      await onSave({
        siteName: form.siteName.trim(),
        siteUrl: form.siteUrl.trim(),
        username: form.username.trim(),
        password: form.password,
        category: form.category,
        notes: form.notes.trim()
      });
    } catch (err) {
      setError(err?.message || 'Không thể thêm mục.');
    }
  };

  const handleQuickGenerate = () => {
    const pw = generatePassword({ length: 16, useUpper: true, useLower: true, useDigits: true, useSymbols: true });
    setForm((f) => ({ ...f, password: pw }));
  };

  return (
    <div className="view scroll-view">
      <div className="view-header">
        <button type="button" className="icon-btn" onClick={onCancel} title="Hủy">
          ←
        </button>
        <h2 className="view-title">Thêm mục mới</h2>
        <div />
      </div>

      <form className="form" onSubmit={handleSubmit} autoComplete="off">
        {/* Site Name */}
        <div className="form-group">
          <label htmlFor="add-siteName">Tên trang web *</label>
          <input
            id="add-siteName"
            type="text"
            placeholder="Google, Facebook..."
            value={form.siteName}
            onChange={(e) => set('siteName')(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        {/* URL */}
        <div className="form-group">
          <label htmlFor="add-siteUrl">URL (tùy chọn)</label>
          <input
            id="add-siteUrl"
            type="url"
            placeholder="https://example.com"
            value={form.siteUrl}
            onChange={(e) => set('siteUrl')(e.target.value)}
            disabled={loading}
          />
        </div>

        {/* Username */}
        <div className="form-group">
          <label htmlFor="add-username">Username / Email *</label>
          <input
            id="add-username"
            type="text"
            placeholder="user@email.com"
            value={form.username}
            onChange={(e) => set('username')(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        {/* Password */}
        <div className="form-group">
          <label htmlFor="add-password">Mật khẩu *</label>
          <div className="password-row">
            <PasswordInput
              id="add-password"
              value={form.password}
              onChange={set('password')}
              placeholder="Nhập hoặc sinh mật khẩu"
              disabled={loading}
              required
            />
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onGoGenerator ? onGoGenerator('add') : handleQuickGenerate()}
              disabled={loading}
              style={{ alignSelf: 'flex-end', marginBottom: 2 }}
            >
              ⚡ Sinh
            </button>
          </div>
          {strength && (
            <PasswordStrengthBar
              score={strength.score}
              label={strength.label}
              color={strength.color}
            />
          )}
        </div>

        {/* Category */}
        <div className="form-group">
          <label htmlFor="add-category">Danh mục</label>
          <select
            id="add-category"
            value={form.category}
            onChange={(e) => set('category')(e.target.value)}
            disabled={loading}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.icon} {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <div className="form-group">
          <label htmlFor="add-notes">Ghi chú (tùy chọn)</label>
          <textarea
            id="add-notes"
            placeholder="Ghi chú thêm..."
            value={form.notes}
            onChange={(e) => set('notes')(e.target.value)}
            disabled={loading}
          />
        </div>

        {error && <div className="msg-error">{error}</div>}

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={loading}>
            Hủy
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Đang lưu...' : '💾 Lưu'}
          </button>
        </div>
      </form>
    </div>
  );
}
