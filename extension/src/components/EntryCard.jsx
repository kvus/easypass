import { useState } from 'react';
import { getCategoryInfo, copyToClipboard } from '../../modules/utils.js';

/**
 * EntryCard — card hiển thị 1 mục mật khẩu trong vault
 * Props:
 *  - item: PasswordItem
 *  - onEdit: (item) => void
 *  - loading: boolean
 */
export default function EntryCard({ item, onEdit, onAutoFill, isMatch = false, loading = false }) {
  const [showPw, setShowPw] = useState(false);
  const [copied, setCopied] = useState(false);
  const cat = getCategoryInfo(item.category);

  const handleCopy = async () => {
    const ok = await copyToClipboard(item.password || '');
    if (!ok) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const maskedPassword = item.password
    ? '•'.repeat(Math.max(8, Math.min(item.password.length, 16)))
    : '—';

  return (
    <article className="entry-card">
      <div className="entry-top">
        <div className="entry-info">
          <div className="entry-site">{item.siteName || '(Không tên)'}</div>
          <div className="entry-user">{item.username || '—'}</div>
        </div>
        <span className="category-badge">
          {cat.icon} {cat.label}
        </span>
      </div>

      <div className="entry-middle">
        <span className="entry-password">
          {showPw ? item.password || '—' : maskedPassword}
        </span>
        <div className="entry-pw-actions">
          <button
            type="button"
            className="icon-btn sm"
            title={showPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            onClick={() => setShowPw((v) => !v)}
          >
            {showPw ? '🙈' : '👁'}
          </button>
          <button
            type="button"
            className="icon-btn sm"
            title="Sao chép mật khẩu"
            onClick={handleCopy}
          >
            {copied ? '✅' : '📋'}
          </button>
        </div>
      </div>

      <div className="entry-footer">
        {isMatch && (
          <span className="entry-match-hint">🎯 Gợi ý website</span>
        )}
        <div className="entry-actions">
          {onAutoFill && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onAutoFill(item)}
              disabled={loading}
            >
              ⚡ Điền
            </button>
          )}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onEdit(item)}
            disabled={loading}
          >
            ✏️ Sửa
          </button>
        </div>
      </div>
    </article>
  );
}
