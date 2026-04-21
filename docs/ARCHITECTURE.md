# 🏗️ Kiến trúc bảo mật — EasyPass

## Tổng quan

EasyPass tuân theo mô hình **Zero-Knowledge**: server lưu trữ dữ liệu nhưng _không bao giờ_ có khả năng đọc được nội dung. Toàn bộ thao tác mật mã diễn ra phía client (trình duyệt Chrome).

---

## Mô hình phân tầng

```
┌─────────────────────────────────────────────────────────┐
│  Tầng 5 — UI Layer                                      │
│  Chrome Extension Popup (React 18 + Vite)               │
│  LoginView, VaultView, AddEntry, EditEntry, Generator,  │
│  Settings, QuickUnlock, RegisterView                    │
├─────────────────────────────────────────────────────────┤
│  Tầng 4 — Business Logic Layer                          │
│  AuthModule | CryptoModule | VaultManager |             │
│  SyncModule | UtilModule                                │
├─────────────────────────────────────────────────────────┤
│  Tầng 3 — API Client Layer                              │
│  fetch API (HTTP) + chrome.runtime messaging            │
├─────────────────────────────────────────────────────────┤
│  Tầng 2 — Server Layer                                  │
│  Express REST API + JWT Middleware                       │
│  POST /register, POST /login, GET /vault, PUT /vault    │
├─────────────────────────────────────────────────────────┤
│  Tầng 1 — Data Layer                                    │
│  MySQL 8 (USER + VAULT tables)                          │
└─────────────────────────────────────────────────────────┘
```

Nguyên tắc: tầng trên chỉ giao tiếp với tầng liền kề bên dưới. **CryptoModule** và **VaultManager** (tầng 4) hoạt động hoàn toàn trong RAM, không bao giờ tiếp xúc trực tiếp với tầng Data Layer.

---

## Luồng mật mã học (Cryptographic Flow)

### 1. Đăng ký tài khoản

```
Client                                     Server
  │                                          │
  │  username + authHash = SHA-256(MP)       │
  │ ──────────────── POST /register ───────► │
  │                                          │ salt = random(16 bytes)
  │                                          │ INSERT USER (username, authHash, salt)
  │                                          │ INSERT VAULT (empty)
  │                 201 Created              │
  │ ◄─────────────────────────────────────── │
```

### 2. Đăng nhập + Giải mã Vault

```
Client                                     Server
  │                                          │
  │  authHash = SHA-256(MP)                  │
  │ ──────────────── POST /login ──────────► │
  │                                          │ timingSafeEqual(stored_h, authHash)
  │          { token: JWT, salt: S }         │
  │ ◄─────────────────────────────────────── │
  │                                          │
  │ ──────────────── GET /vault ───────────► │ (Authorization: Bearer JWT)
  │        { encryptedData: C }              │
  │ ◄─────────────────────────────────────── │
  │                                          │
  │  MK = PBKDF2(MP, S, 600000, SHA-256)    │
  │  M  = AES-256-GCM.decrypt(C, MK)       │
  │  ✓  Verify GCM integrity tag            │
  │  → Hiển thị danh sách mật khẩu          │
```

### 3. Thay đổi dữ liệu (CRUD) + Đồng bộ

```
Client                                     Server
  │                                          │
  │  M' = CRUD operations trên M (RAM)       │
  │  C' = AES-256-GCM.encrypt(M', MK)       │
  │                                          │
  │ ──────────────── PUT /vault ────────────►│
  │  { encryptedData: C' }                   │
  │              200 OK                      │
  │ ◄─────────────────────────────────────── │
```

### 4. Đổi Master Password

```
Client                                     Server
  │                                          │
  │  Verify MP_old (decrypt vault OK?)       │
  │  S' = new random salt                    │
  │  h' = SHA-256(MP_new)                    │
  │  MK' = PBKDF2(MP_new, S', 600k)         │
  │  C' = AES-256-GCM.encrypt(M, MK')       │
  │                                          │
  │ ──────────────── PUT /vault ────────────►│
  │  { encryptedData: C',                    │
  │    newAuthHash: h', newSalt: S' }        │  Transaction:
  │              200 OK                      │  UPDATE VAULT SET encrypted_data = C'
  │ ◄─────────────────────────────────────── │  UPDATE USER SET auth_hash = h', salt = S'
```

---

## Chi tiết thuật toán

### PBKDF2-SHA256 — Key Derivation

```javascript
// modules/crypto.js → deriveKey()
MK = PBKDF2(
  password:   MP,              // Master Password (input từ user)
  salt:       S,               // 16 bytes ngẫu nhiên từ server
  iterations: 600000,          // OWASP 2023 recommendation
  hash:       "SHA-256",
  keyLength:  256              // AES-256 key
)
```

- **600,000 iterations**: đủ chậm để chống brute-force (~300-500ms trên máy tiêu chuẩn), đủ nhanh cho UX chấp nhận được.
- MK là `CryptoKey` object, được đánh dấu `extractable = true` để có thể lưu vào `chrome.storage.session` (dạng Base64) phục vụ Quick Unlock.

### AES-256-GCM — Authenticated Encryption

```javascript
// modules/crypto.js → encryptVault()
IV = crypto.getRandomValues(new Uint8Array(12))  // 96-bit random nonce
ciphertext = AES-256-GCM.encrypt(
  plaintext: JSON.stringify(vaultData),
  key:       MK,
  iv:        IV
)
output = Base64( IV[12 bytes] || ciphertext || GCM_tag[16 bytes] )
```

- **IV mới cho mỗi lần mã hóa** — đảm bảo semantic security.
- GCM tag 128-bit tích hợp sẵn — phát hiện mọi thay đổi trái phép trên ciphertext.
- Nếu giải mã thất bại (sai key hoặc dữ liệu bị tampering), Web Crypto API tự động throw error.

### SHA-256 — Authentication Hash

```javascript
// modules/crypto.js → computeAuthHash()
authHash = hex(SHA-256(masterPassword))  // 64-char hex string
```

- **auth_hash ≠ Master Password** — Server không thể tìm lại MP từ hash.
- Server so sánh bằng `crypto.timingSafeEqual()` — chống timing side-channel attack.

---

## Mô hình dữ liệu

### Server-side (MySQL)

```sql
-- Bảng USER
CREATE TABLE USER (
  user_id     CHAR(36)     NOT NULL PRIMARY KEY,  -- UUID v4
  username    VARCHAR(50)  NOT NULL UNIQUE,
  auth_hash   CHAR(64)     NOT NULL,               -- SHA-256(MP) hex
  salt        CHAR(32)     NOT NULL,               -- 16 bytes hex
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bảng VAULT (1:1 với USER)
CREATE TABLE VAULT (
  vault_id        CHAR(36)   NOT NULL PRIMARY KEY,
  user_id         CHAR(36)   NOT NULL UNIQUE,     -- FK → USER, ON DELETE CASCADE
  encrypted_data  LONGTEXT   NOT NULL,            -- AES-256-GCM ciphertext (Base64)
  updated_at      TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Client-side (RAM only)

```javascript
// UserSession — lưu trong chrome.storage
{
  userId:          "uuid-...",
  sessionToken:    "eyJhbGci...",     // JWT
  salt:            "a1b2c3d4...",     // hex (32 chars)
  masterKeyBase64: "base64..."        // MK exported (session storage only)
}

// VaultData — sau khi giải mã
{
  version: 1,
  items: [
    {
      itemId:    "uuid-...",          // crypto.randomUUID()
      siteName:  "GitHub",
      siteUrl:   "https://github.com",
      username:  "user@email.com",
      password:  "s3cur3P@ss!",      // Plaintext — chỉ trong RAM
      notes:     "",
      category:  "work",             // email | bank | social | work | shopping | other
      createdAt: "2025-03-05T..."    // ISO 8601
    }
  ]
}
```

> ⚠️ **VaultData** và **MasterKey** không bao giờ được ghi xuống đĩa hay `localStorage`. Chỉ tồn tại trong RAM phiên trình duyệt.

---

## Quản lý phiên (Session Management)

EasyPass sử dụng hai tầng storage của Chrome Extension:

| Storage | Dữ liệu | Persistence | Bảo mật |
|---|---|---|---|
| `chrome.storage.local` | userId, sessionToken, salt | Persist across restarts | JWT có expiry (1h) |
| `chrome.storage.session` | masterKeyBase64 | RAM only, xóa khi đóng trình duyệt | Không ghi đĩa |

**Quick Unlock flow:** Khi mở lại Extension, hệ thống kiểm tra:
1. `chrome.storage.local` → có `sessionToken`? → verify JWT còn hạn?
2. `chrome.storage.session` → có `masterKeyBase64`? → import lại `CryptoKey`
3. Nếu cả hai OK → tự động decrypt vault, bỏ qua màn hình login.

**Logout flow:**
1. Client gọi `POST /api/logout` với Bearer token → server ghi `jti` vào `TOKEN_BLACKLIST`.
2. Client xóa toàn bộ `chrome.storage.local` và `chrome.storage.session` (token, MK, salt).
3. Mọi request sau đó dùng token cũ đều bị từ chối ngay (blacklist check trong jwtMiddleware), kể cả khi token chưa hết hạn tự nhiên.

---

## Module Chart

```
                    ┌───────────────────────────────┐
                    │      EasyPass Extension        │
                    └───────────────┬───────────────┘
          ┌─────────────┬──────────┼──────────┬───────────────┐
          ▼             ▼          ▼          ▼               ▼
   ┌─────────────┐ ┌─────────┐ ┌──────────┐ ┌────────┐ ┌─────────┐
   │ AuthModule  │ │ Crypto  │ │  Vault   │ │  Sync  │ │  Util   │
   │             │ │ Module  │ │ Manager  │ │ Module │ │ Module  │
   ├─────────────┤ ├─────────┤ ├──────────┤ ├────────┤ ├─────────┤
   │authenticate │ │deriveKey│ │listEntry │ │syncVault│ │genPass  │
   │register     │ │encrypt  │ │addEntry  │ │        │ │copyClip │
   │fetchVault   │ │decrypt  │ │editEntry │ │        │ │formatDt │
   │logout       │ │authHash │ │delEntry  │ │        │ │strength │
   │             │ │export/  │ │search    │ │        │ │category │
   │             │ │importKey│ │createEmpty│ │        │ │         │
   └─────────────┘ └─────────┘ └──────────┘ └────────┘ └─────────┘
```

---

## Threat Model

| Mối đe dọa | Biện pháp |
|---|---|
| Server bị xâm phạm | Zero-Knowledge: server chỉ có ciphertext, không có key |
| Brute-force Master Password | PBKDF2 600k iterations (~300-500ms/attempt) |
| Brute-force login endpoint | Rate limiting: 10 requests/phút per IP trên `POST /login` (`express-rate-limit`) |
| Spam đăng ký tài khoản | Rate limiting: 5 requests/giờ per IP trên `POST /register` (`express-rate-limit`) |
| Tampering ciphertext | AES-GCM integrity tag phát hiện mọi thay đổi |
| Timing side-channel (login) | `crypto.timingSafeEqual()` cho hash comparison |
| Token reuse sau logout | JWT blacklist (`TOKEN_BLACKLIST` table) — `jti` bị thu hồi tức thì |
| Man-in-the-middle | HTTPS (production), CORS whitelist |
| XSS trong extension | Manifest V3 + `content_security_policy` trong manifest.json |
| Clickjacking / header injection | `helmet` middleware (X-Frame-Options, X-Content-Type-Options, HSTS, …) |
| Memory dump attack | MK xóa khỏi RAM khi logout; `chrome.storage.session` = RAM only |
| Stolen token (session hijack) | Logout thu hồi token server-side; expiry 1h giới hạn window tấn công |
