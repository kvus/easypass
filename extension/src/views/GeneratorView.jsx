import { useState, useEffect, useCallback } from 'react';
import PasswordStrengthBar from '../components/PasswordStrengthBar.jsx';
import { generatePassword, assessStrength, copyToClipboard } from '../../modules/utils.js';

const DEFAULT_OPTIONS = {
  length: 16,
  useUpper: true,
  useLower: true,
  useDigits: true,
  useSymbols: true
};

/**
 * GeneratorView — S06: Sinh mật khẩu ngẫu nhiên
 * Props:
 *  - onUse: (password, target) => void — điền mật khẩu về form nguồn
 *  - onBack: () => void
 *  - genTarget: 'add' | 'edit' | null
 */
export default function GeneratorView({ onUse, onBack, genTarget = null }) {
  const [options, setOptions] = useState(DEFAULT_OPTIONS);
  const [password, setPassword] = useState('');
  const [strength, setStrength] = useState(null);
  const [copied, setCopied] = useState(false);

  const regenerate = useCallback(() => {
    const pw = generatePassword(options);
    setPassword(pw);
    setStrength(assessStrength(pw));
  }, [options]);

  // Sinh mật khẩu lần đầu khi mở
  useEffect(() => {
    regenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tự động sinh lại khi options thay đổi
  useEffect(() => {
    const pw = generatePassword(options);
    setPassword(pw);
    setStrength(assessStrength(pw));
  }, [options]);

  const setOpt = (key) => (value) => setOptions((o) => ({ ...o, [key]: value }));

  const handleCopyAndUse = async () => {
    await copyToClipboard(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    if (onUse) {
      onUse(password, genTarget);
    }
  };

  return (
    <div className="view scroll-view">
      <div className="view-header">
        <button type="button" className="icon-btn" onClick={onBack} title="Quay lại">
          ←
        </button>
        <h2 className="view-title">Sinh mật khẩu</h2>
        <div />
      </div>

      {/* Password preview */}
      <div className="gen-preview-card">
        <div className="gen-password-display" id="gen-password-display">
          {password || '...'}
        </div>
        {strength && (
          <PasswordStrengthBar
            score={strength.score}
            label={strength.label}
            color={strength.color}
          />
        )}
      </div>

      {/* Options */}
      <div className="form" style={{ marginTop: 14 }}>
        {/* Length slider */}
        <div className="form-group">
          <label htmlFor="gen-length">
            Độ dài: <strong>{options.length}</strong>
          </label>
          <input
            id="gen-length"
            type="range"
            min={8}
            max={64}
            value={options.length}
            onChange={(e) => setOpt('length')(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--primary)' }}
          />
          <div className="range-labels">
            <span>8</span>
            <span>64</span>
          </div>
        </div>

        {/* Checkboxes */}
        <div className="checkbox-grid">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={options.useUpper}
              onChange={(e) => setOpt('useUpper')(e.target.checked)}
            />
            <span>Chữ hoa (A–Z)</span>
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={options.useLower}
              onChange={(e) => setOpt('useLower')(e.target.checked)}
            />
            <span>Chữ thường (a–z)</span>
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={options.useDigits}
              onChange={(e) => setOpt('useDigits')(e.target.checked)}
            />
            <span>Số (0–9)</span>
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={options.useSymbols}
              onChange={(e) => setOpt('useSymbols')(e.target.checked)}
            />
            <span>Ký tự đặc biệt (!@#...)</span>
          </label>
        </div>

        {/* Actions */}
        <button
          type="button"
          className="btn btn-secondary btn-full"
          onClick={regenerate}
        >
          🔄 Sinh lại
        </button>

        <button
          type="button"
          className="btn btn-primary btn-full"
          onClick={handleCopyAndUse}
        >
          {copied ? '✅ Đã sao chép!' : '📋 Sao chép & Dùng'}
        </button>

        <button
          type="button"
          className="btn btn-secondary btn-full"
          onClick={onBack}
        >
          ← Hủy
        </button>
      </div>
    </div>
  );
}
