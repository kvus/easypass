# Changelog — EasyPass

Tất cả các thay đổi đáng chú ý của dự án được ghi lại ở đây theo chuẩn [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.1.0] — 2025-04-21 · Security Hardening Release

Phiên bản này tập trung hoàn toàn vào tăng cường bảo mật và chất lượng code sau security review nội bộ. Không có thay đổi nào phá vỡ backward-compatibility.

### 🔒 Security — CRITICAL

- **JWT Token Blacklist** (`C2`): Implement `TOKEN_BLACKLIST` table trong DB. Khi logout, `jti` của token được ghi vào blacklist và bị từ chối tức thì bởi `jwtMiddleware` — kể cả khi token chưa hết hạn 1h tự nhiên.
- **Rate Limiting** (`C1`): Giới hạn `POST /api/login` tối đa **10 requests/phút per IP** bằng `express-rate-limit`. Trả về `429 Too Many Requests` khi vượt quá.
- **Base64 Validation** (`C3`): `PUT /api/vault` từ chối `encryptedData` không đúng định dạng Base64 chuẩn (reject `400`) thay vì lưu dữ liệu rác vào DB.

### 🔒 Security — HIGH

- **JWT_SECRET Fail-Fast** (`H1`): Server crash ngay khi khởi động nếu `JWT_SECRET` env var không được set. Xóa bỏ hardcoded fallback `'super_secret_jwt_key_change_in_production'`.
- **HTTP Security Headers** (`M1`): Tích hợp `helmet` middleware — tự động thêm `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, `X-DNS-Prefetch-Control`, v.v.
- **Content Security Policy** (`M5`): Thêm `content_security_policy.extension_pages` vào `manifest.json` — chặn inline scripts và giới hạn `connect-src` chỉ đến server đã biết.

### 🐛 Bug Fixes

- **generatedPassword Leak** (`H3`): Reset `generatedPassword` khi mở EditEntryView — ngăn mật khẩu sinh từ session trước xuất hiện trong form chỉnh sửa.
- **SettingsView API Consistency** (`H4`): Thay `fetch('/api/vault', ...)` trực tiếp bằng `syncVault()` từ `sync.js`, sửa URL tương đối → tuyệt đối, đồng nhất cách gọi API trong toàn app.
- **ErrorBoundary** (`H2`): Thêm React `ErrorBoundary` bao quanh `<App>` — hiển thị UI fallback + nút **Tải lại** thay vì blank screen khi gặp lỗi render không mong muốn.

### ♻️ Refactoring

- **App.jsx Split** (`M2`): Tách auth handlers (`handleLogin`, `handleRegister`, `handleLogout`, …) ra `useAuth.js` hook. App.jsx giảm từ 375 → 175 dòng, chỉ còn UI state + render.
- **sync.js Extended** (`H4`): `syncVault()` nhận thêm optional `changePasswordPayload` — hỗ trợ change-password flow mà không cần thêm function mới.

### 🗑️ Cleanup

- **Xóa `docs/test.md`** (`M7`): File ghi chú cá nhân không liên quan đến dự án.

### 🧪 Tests

- **Frontend** — thêm 2 test suites mới (22 → 36 tests):
  - `vault-manager.test.js`: 14 cases cho `addEntry`, `editEntry`, `deleteEntry`, `searchEntries` (immutability, edge cases)
  - `utils.test.js`: 14 cases cho `generatePassword` (charset, length, randomness) và `assessStrength` (score progression)
- **Backend** — mở rộng `vault.test.js` (8 → 11 tests):
  - Base64 validation rejection (400)
  - Change-password flow: verify cả vault + USER rows được update trong 1 transaction
  - Invalid `newAuthHash` format rejection

---

## [1.0.0] — 2025-04-08 · Initial Release

### ✨ Features

- **Zero-Knowledge Encryption**: Toàn bộ mã hóa diễn ra phía client — server không bao giờ thấy Master Password hay plaintext vault.
- **PBKDF2-SHA256** (600,000 iterations) để dẫn xuất Master Key.
- **AES-256-GCM** để mã hóa vault với IV ngẫu nhiên mỗi lần.
- **Chrome Extension** (Manifest V3) với popup React 18 + Vite 5.
- **8 màn hình**: Login, Register, Vault, Add Entry, Edit Entry, Generator, Settings, Quick Unlock.
- **Auto-fill**: Content script tự động điền username/password vào form login.
- **Password Generator**: Sinh mật khẩu ngẫu nhiên mật mã 8–64 ký tự.
- **Change Master Password**: Tái mã hóa toàn bộ vault và cập nhật auth_hash trong 1 transaction.
- **Quick Unlock**: Mở lại Extension không cần nhập Master Password — dùng key đã cache trong `chrome.storage.session`.
- **Cloud Sync**: Đồng bộ bản mã qua REST API (Express + MySQL).
- **JWT Authentication**: HS256, 1h expiry.
- **Docker Compose**: MySQL 8.0 + Node.js server containerized.
