import { useState, useEffect } from 'react';
import PasswordInput from '../components/PasswordInput.jsx';
import PasswordStrengthBar from '../components/PasswordStrengthBar.jsx';
import { assessStrength, generatePassword, CATEGORIES } from '../../modules/utils.js';

/**
 * EditEntryView — S05: Form chỉnh sửa / xóa một mục trong vault
 * Props:
 *  - item: PasswordItem — mục hiện đang được chỉnh sửa
 *  - onSave: (itemId, updates) => Promise<void>
 *  - onDelete: (itemId) => Promise<void>
 *  - onCancel: () => void
 *  - onGoGenerator: (target) => void
 *  - generatedPassword: string
 *  - loading: boolean
 */
export default function EditEntryView({
  item,
  onSave,
  onDelete,
  onCancel,
  onGoGenerator,
  generatedPassword = '',
  loading = false
}) {
  const [form, setForm] = useState({
    siteName: item?.siteName || '',
    siteUrl: item?.siteUrl || '',
    username: item?.username || '',
    password: generatedPassword || item?.password || '',
    category: item?.category || 'other',
    notes: item?.notes || ''
  });
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (generatedPassword) setForm(f => ({ ...f, password: generatedPassword }));
  }, [generatedPassword]);

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
      await onSave(item.itemId, {
        siteName: form.siteName.trim(),
        siteUrl: form.siteUrl.trim(),
        username: form.username.trim(),
        password: form.password,
        category: form.category,
        notes: form.notes.trim()
      });
    } catch (err) {
      setError(err?.message || 'Không thể cập nhật mục.');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    try {
      await onDelete(item.itemId);
    } catch (err) {
      setError(err?.message || 'Không thể xóa mục.');
      setConfirmDelete(false);
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
        <h2 className="view-title">Chỉnh sửa mục</h2>
        <div />
      </div>

      <form className="form" onSubmit={handleSubmit} autoComplete="off">
        {/* Site Name */}
        <div className="form-group">
          <label htmlFor="edit-siteName">Tên trang web *</label>
          <input
            id="edit-siteName"
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
          <label htmlFor="edit-siteUrl">URL (tùy chọn)</label>
          <input
            id="edit-siteUrl"
            type="url"
            placeholder="https://example.com"
            value={form.siteUrl}
            onChange={(e) => set('siteUrl')(e.target.value)}
            disabled={loading}
          />
        </div>

        {/* Username */}
        <div className="form-group">
          <label htmlFor="edit-username">Username / Email *</label>
          <input
            id="edit-username"
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
          <label htmlFor="edit-password">Mật khẩu *</label>
          <div className="password-row">
            <PasswordInput
              id="edit-password"
              value={form.password}
              onChange={set('password')}
              placeholder="Nhập hoặc sinh mật khẩu"
              disabled={loading}
              required
            />
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onGoGenerator ? onGoGenerator('edit') : handleQuickGenerate()}
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
          <label htmlFor="edit-category">Danh mục</label>
          <select
            id="edit-category"
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
          <label htmlFor="edit-notes">Ghi chú (tùy chọn)</label>
          <textarea
            id="edit-notes"
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

      {/* Delete zone */}
      <div className="danger-zone">
        {confirmDelete ? (
          <div className="delete-confirm">
            <p className="delete-confirm-text">Bạn có chắc muốn xóa mục này không?</p>
            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConfirmDelete(false)}
                disabled={loading}
              >
                Không
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDelete}
                disabled={loading}
              >
                {loading ? 'Đang xóa...' : '🗑 Xóa'}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn-danger btn-full"
            onClick={handleDelete}
            disabled={loading}
          >
            🗑 Xóa mục này
          </button>
        )}
      </div>
    </div>
  );
}
