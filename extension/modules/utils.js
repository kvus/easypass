// ============================================================
//  UtilModule — Utility functions
// ============================================================

/**
 * Generate a cryptographically secure random password
 * Uses crypto.getRandomValues() — NOT Math.random()
 *
 * @param {Object} options
 * @param {number}  options.length     — default 16
 * @param {boolean} options.useUpper   — include A-Z
 * @param {boolean} options.useLower   — include a-z
 * @param {boolean} options.useDigits  — include 0-9
 * @param {boolean} options.useSymbols — include special chars
 * @returns {string}
 */
export function generatePassword(options = {}) {
  const {
    length     = 16,
    useUpper   = true,
    useLower   = true,
    useDigits  = true,
    useSymbols = true
  } = options;

  let charset = '';
  if (useUpper)   charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (useLower)   charset += 'abcdefghijklmnopqrstuvwxyz';
  if (useDigits)  charset += '0123456789';
  if (useSymbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';
  if (!charset)   charset  = 'abcdefghijklmnopqrstuvwxyz0123456789';

  const randomValues = crypto.getRandomValues(new Uint32Array(length));
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset[randomValues[i] % charset.length];
  }
  return result;
}

/**
 * Assess password strength on a 0–4 scale
 * @param {string} password
 * @returns {{ score: number, label: string, color: string }}
 */
export function assessStrength(password) {
  let score = 0;
  if (password.length >= 8)  score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const levels = [
    { label: 'Rất yếu',  color: '#ff4444' },
    { label: 'Yếu',      color: '#ff8800' },
    { label: 'Trung bình', color: '#ffcc00' },
    { label: 'Mạnh',     color: '#44cc44' },
    { label: 'Rất mạnh', color: '#00ffaa' }
  ];

  const idx = Math.min(score, 4);
  return { score: idx, ...levels[idx] };
}

/**
 * Copy text to clipboard using the Clipboard API with fallback
 * @param {string} text
 * @returns {Promise<boolean>}
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for restricted contexts
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.opacity  = '0';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    return true;
  }
}

/**
 * Format ISO 8601 date string to Vietnamese locale (dd/mm/yyyy)
 * @param {string} isoString
 * @returns {string}
 */
export function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('vi-VN', {
    year: 'numeric', month: '2-digit', day: '2-digit'
  });
}

/** Category display helpers */
export const CATEGORIES = [
  { value: 'email',    label: 'Email',        icon: '📧' },
  { value: 'bank',     label: 'Ngân hàng',    icon: '🏦' },
  { value: 'social',   label: 'Mạng xã hội',  icon: '👥' },
  { value: 'work',     label: 'Công việc',     icon: '💼' },
  { value: 'shopping', label: 'Mua sắm',       icon: '🛒' },
  { value: 'other',    label: 'Khác',          icon: '🔑' }
];

export function getCategoryInfo(category) {
  return CATEGORIES.find(c => c.value === category) || CATEGORIES.at(-1);
}
