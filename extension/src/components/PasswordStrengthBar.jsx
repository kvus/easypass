/**
 * PasswordStrengthBar — thanh hiển thị độ mạnh mật khẩu
 * Props:
 *  - score: 0-4 (từ assessStrength)
 *  - label: string (nhãn mô tả độ mạnh)
 *  - color: string (màu hex/css)
 */
export default function PasswordStrengthBar({ score = 0, label = '', color = '#ff4444' }) {
  const segments = [0, 1, 2, 3, 4];

  return (
    <div className="strength-bar-wrap">
      <div className="strength-segments">
        {segments.map((i) => (
          <div
            key={i}
            className="strength-segment"
            style={{
              background: i < score ? color : 'rgba(255,255,255,0.1)',
              transition: 'background 0.3s ease'
            }}
          />
        ))}
      </div>
      {label && (
        <span className="strength-label" style={{ color }}>
          {label}
        </span>
      )}
    </div>
  );
}
