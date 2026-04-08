/**
 * Toast — thông báo nổi tự ẩn
 * Props:
 *  - msg: string (nội dung thông báo)
 *  - type: 'info' | 'success' | 'error'
 */
export default function Toast({ msg, type = 'info' }) {
  if (!msg) return null;

  const typeClass = {
    info: 'toast-info',
    success: 'toast-success',
    error: 'toast-error'
  }[type] || 'toast-info';

  return (
    <div className={`toast ${typeClass}`} role="status" aria-live="polite">
      {msg}
    </div>
  );
}
