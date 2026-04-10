# 🤝 Hướng dẫn phát triển — EasyPass

## Cấu trúc module

### Client-side (Chrome Extension)

```
extension/
├── modules/           ← Business logic (không phụ thuộc UI)
│   ├── auth.js        → AuthModule: authenticate, register, fetchVault, logout
│   ├── crypto.js      → CryptoModule: deriveKey, encrypt/decryptVault, authHash
│   ├── vault-manager.js → VaultManager: CRUD trên VaultData (pure functions)
│   ├── sync.js        → SyncModule: syncVault (PUT /vault)
│   └── utils.js       → UtilModule: generatePassword, copyToClipboard, formatDate
├── src/
│   ├── views/         ← React components (UI)
│   ├── components/    ← Reusable UI components
│   └── hooks/         ← Custom hooks (useSession, useVault, useToast)
├── background/        ← Service Worker (session management)
└── content/           ← Content script (auto-fill)
```

### Server-side (Backend)

```
server/
├── app.js             ← Express entry point
├── routes/
│   ├── auth.routes.js ← POST /register, POST /login
│   └── vault.routes.js ← GET /vault, PUT /vault
├── middleware/
│   └── jwt.middleware.js ← JWT verification
└── db/
    └── schema.sql     ← Database DDL
```

---

## Quy tắc code

### Nguyên tắc chung

1. **Tách biệt mật mã và UI** — Mọi thao tác crypto nằm trong `modules/crypto.js`, UI không gọi `crypto.subtle` trực tiếp.
2. **VaultManager là pure functions** — Không gọi network, không gọi crypto. Chỉ thao tác trên JavaScript objects.
3. **Server là "kho mù"** — Server routes không bao giờ parse hay đọc `encrypted_data`. Chỉ store và retrieve.
4. **Không lưu dữ liệu nhạy cảm** — Master Password, Master Key, plaintext vault không được ghi vào `localStorage`, logs, hay console.

### Naming conventions

| Loại | Convention | Ví dụ |
|---|---|---|
| Files | kebab-case | `vault-manager.js` |
| Components | PascalCase | `EntryCard.jsx` |
| Functions | camelCase | `deriveKey()` |
| Constants | SCREAMING_SNAKE | `API_BASE` |
| DB columns | snake_case | `auth_hash` |

### Crypto module conventions

- Sử dụng **Web Crypto API** — không dùng thư viện bên ngoài cho AES/PBKDF2/SHA-256.
- IV phải là **12 bytes ngẫu nhiên** mới cho mỗi lần encrypt.
- Output format: `Base64(IV[12] || ciphertext || GCM_tag[16])`.
- Khi decrypt thất bại → throw Error, không return null.

---

## Development workflow

### 1. Chạy backend (development mode)

```bash
# Khởi động DB
docker compose up -d db

# Chạy server với hot-reload
cd server
npm run dev
```

### 2. Phát triển Extension

```bash
cd extension

# Build và watch
npm run build -- --watch

# Hoặc chạy Vite dev server (cho UI development)
npm run dev
```

Sau khi sửa code:
1. Build lại: `npm run build`
2. Reload extension: `chrome://extensions/` → click 🔄 trên EasyPass

### 3. Chạy tests

```bash
# Extension tests
cd extension && npm run test

# Server tests
cd server && npm run test

# Watch mode (extension)
cd extension && npm run test:watch
```

---

## Thêm tính năng mới

### Thêm màn hình mới

1. Tạo file `src/views/MyNewView.jsx`
2. Thêm route trong `App.jsx` (switch case `currentView`)
3. Xác định modules cần gọi (xem bảng Screen → Module mapping trong `docs/ARCHITECTURE.md`)

### Thêm API endpoint mới

1. Tạo hoặc sửa file trong `server/routes/`
2. Đăng ký route trong `server/app.js`
3. Nếu cần authentication: thêm `jwtMiddleware` trước route
4. Cập nhật `docs/API.md`

### Thêm field vào PasswordItem

1. Sửa `modules/vault-manager.js` → `addEntry()` function
2. Sửa `src/views/AddEntryView.jsx` và `EditEntryView.jsx`
3. **Không cần sửa database** — PasswordItem nằm trong JSON bên trong ciphertext

---

## Testing guidelines

### Frontend (Vitest)

```javascript
// tests/crypto.test.js
import { describe, it, expect } from 'vitest';
import { deriveKey, encryptVault, decryptVault } from '../modules/crypto.js';

describe('CryptoModule', () => {
  it('should derive key from password + salt', async () => {
    const key = await deriveKey('testPassword', 'a'.repeat(32));
    expect(key).toBeInstanceOf(CryptoKey);
  });

  it('should encrypt and decrypt roundtrip', async () => {
    const key = await deriveKey('testPassword', 'a'.repeat(32));
    const data = { version: 1, items: [{ siteName: 'test' }] };
    const encrypted = await encryptVault(data, key);
    const decrypted = await decryptVault(encrypted, key);
    expect(decrypted).toEqual(data);
  });
});
```

### Backend (Jest + Supertest)

```javascript
// tests/auth.test.js
const request = require('supertest');
const app = require('../app');

describe('POST /api/register', () => {
  it('should return 400 if username is missing', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({ authHash: 'a'.repeat(64) });
    expect(res.status).toBe(400);
  });
});
```

---

## Dependencies

### Extension (client-side)

| Package | Version | Vai trò |
|---|---|---|
| `react` | ^18.3 | UI framework |
| `react-dom` | ^18.3 | React DOM renderer |
| `vite` | ^5.4 | Build tool |
| `@vitejs/plugin-react` | ^4.3 | Vite React plugin |
| `vitest` | ^4.1 | Test runner |
| `@testing-library/react` | ^16.3 | Component testing |
| `jsdom` | ^29.0 | DOM environment for tests |

### Server (backend)

| Package | Version | Vai trò |
|---|---|---|
| `express` | ^4.19 | HTTP framework |
| `mysql2` | ^3.9 | MySQL driver (Promise-based) |
| `jsonwebtoken` | ^9.0 | JWT sign/verify |
| `cors` | ^2.8 | CORS middleware |
| `dotenv` | ^16.4 | Environment variables |
| `jest` | ^30.3 | Test runner |
| `supertest` | ^7.2 | HTTP testing |
| `nodemon` | ^3.1 | Dev hot-reload |
