# 🌐 API Reference — EasyPass Backend

**Base URL:** `http://localhost:3000`  
**Content-Type:** `application/json`  
**Authentication:** JWT Bearer Token (trả về từ `/api/login`)

---

## Tổng quan Endpoints

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| `POST` | `/api/register` | Đăng ký tài khoản mới | — |
| `POST` | `/api/login` | Xác thực, trả về JWT + Salt | — |
| `POST` | `/api/logout` | Thu hồi JWT (server-side blacklist) | 🔒 JWT |
| `GET` | `/api/vault` | Lấy ciphertext Vault | 🔒 JWT |
| `PUT` | `/api/vault` | Cập nhật ciphertext / Đổi Master Password | 🔒 JWT |
| `GET` | `/health` | Health check | — |

---

## Authentication

Các endpoint yêu cầu xác thực (🔒) cần gửi JWT token trong header:

```
Authorization: Bearer <jwt-token>
```

JWT được tạo bởi server khi đăng nhập thành công, có thời hạn **1 giờ** (configurable qua `JWT_EXPIRES_IN`). Mỗi JWT chứa claim `jti` (JWT ID) để hỗ trợ thu hồi tức thì qua blacklist.

> 🔒 **Rate Limiting:** `POST /api/login` bị giới hạn **10 requests/phút** per IP. Vượt quá sẽ nhận `429 Too Many Requests`.

---

## Endpoints chi tiết

### `POST /api/register`

Tạo tài khoản mới. Server tự sinh `salt` (16 bytes random) và tạo một Vault rỗng cho user.

**Request Body:**

```json
{
  "username": "string (3-50 chars, [A-Za-z0-9_-.])",
  "authHash": "string (SHA-256 hex, exactly 64 chars)"
}
```

**Responses:**

| Status | Body | Mô tả |
|---|---|---|
| `201` | `{"userId": "uuid-...", "message": "Đăng ký thành công"}` | Tạo thành công |
| `400` | `{"message": "Thiếu username hoặc authHash"}` | Thiếu field |
| `400` | `{"message": "Username chỉ được chứa chữ, số, dấu gạch (3-50 ký tự)"}` | Username không hợp lệ |
| `400` | `{"message": "authHash không hợp lệ (phải là SHA-256 hex, 64 chars)"}` | Hash sai format |
| `409` | `{"message": "Tên đăng nhập đã tồn tại"}` | Username trùng |
| `500` | `{"message": "Lỗi server khi đăng ký"}` | Internal error |

**Ví dụ:**

```bash
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "nguyenvien",
    "authHash": "ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f"
  }'
```

> ⚠️ `authHash` = `SHA-256(masterPassword)` — tính phía **client**, server không bao giờ nhận Master Password.

---

### `POST /api/login`

Xác thực người dùng. Server so sánh hash bằng `crypto.timingSafeEqual()` (constant-time) để chống timing attack.

**Request Body:**

```json
{
  "username": "string",
  "authHash": "string (SHA-256 hex, 64 chars)"
}
```

**Responses:**

| Status | Body | Mô tả |
|---|---|---|
| `200` | `{"token": "eyJhbGci...", "salt": "a1b2c3...", "userId": "uuid-..."}` | Đăng nhập thành công |
| `400` | `{"message": "Thiếu username hoặc authHash"}` | Thiếu field |
| `400` | `{"message": "authHash không hợp lệ..."}` | Hash sai format |
| `401` | `{"message": "Sai tên đăng nhập hoặc mật khẩu"}` | Xác thực thất bại |
| `429` | `{"message": "Quá nhiều yêu cầu đăng nhập, vui lòng thử lại sau"}` | Rate limit (10 req/phút) |
| `500` | `{"message": "Lỗi server khi đăng nhập"}` | Internal error |

**Response thành công:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "salt": "a1b2c3d4e5f67890a1b2c3d4e5f67890",
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

| Field | Mô tả |
|---|---|
| `token` | JWT (HS256), thời hạn 1h, chứa `{userId, jti}` |
| `salt` | 32-char hex string (16 bytes), dùng cho PBKDF2 phía client |
| `userId` | UUID v4 của user |

---

### `POST /api/logout`

Thu hồi JWT hiện tại bằng cách ghi `jti` vào bảng `TOKEN_BLACKLIST`. Mọi request sau đó dùng token này sẽ bị từ chối ngay lập tức, kể cả khi token chưa hết hạn tự nhiên.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:** _(không cần)_

**Responses:**

| Status | Body | Mô tả |
|---|---|---|
| `200` | `{"message": "Đăng xuất thành công"}` | Token đã được thu hồi |
| `401` | `{"message": "Thiếu token xác thực"}` | Không có JWT |
| `401` | `{"message": "Token đã hết hạn..."}` | JWT expired |
| `500` | `{"message": "Lỗi server khi đăng xuất"}` | Internal error |

**Ví dụ:**

```bash
curl -X POST http://localhost:3000/api/logout \
  -H "Authorization: Bearer eyJhbGci..."
```

> ℹ️ Extension tự động gọi endpoint này khi người dùng nhấn **Đăng xuất**. Token bị blacklist tức thì — không cần chờ hết hạn 1 giờ.

---

### `GET /api/vault`

Lấy dữ liệu Vault đã mã hóa. Server trả về ciphertext nguyên vẹn — **không đọc, không parse** (Zero-Knowledge).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Responses:**

| Status | Body | Mô tả |
|---|---|---|
| `200` | `{"encryptedData": "Base64...", "updatedAt": "ISO-8601"}` | Thành công |
| `401` | `{"message": "Thiếu token xác thực"}` | Không có JWT |
| `401` | `{"message": "Token đã hết hạn..."}` | JWT expired |
| `404` | `{"message": "Vault không tồn tại"}` | Vault chưa tạo |
| `500` | `{"message": "Lỗi server khi lấy Vault"}` | Internal error |

**Response thành công:**

```json
{
  "encryptedData": "dGhpcyBpcyBiYXNlNjQgZW5jb2RlZCBjaXBoZXJ0ZXh0...",
  "updatedAt": "2025-03-15T10:30:00.000Z"
}
```

| Field | Mô tả |
|---|---|
| `encryptedData` | Base64( IV[12] \|\| AES-GCM ciphertext \|\| GCM tag[16] ) |
| `updatedAt` | Thời điểm đồng bộ cuối cùng |

> Client sử dụng `MK = PBKDF2(MP, salt)` để giải mã `encryptedData`.

---

### `PUT /api/vault`

Cập nhật bản mã Vault mới. Hỗ trợ 2 chế độ:

1. **Cập nhật dữ liệu thông thường** — chỉ gửi `encryptedData`
2. **Đổi Master Password** — gửi thêm `newAuthHash` + `newSalt` (xử lý trong transaction)

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**

```json
{
  "encryptedData": "string (Base64 ciphertext mới)",
  "newAuthHash": "string (optional, SHA-256 hex 64 chars — khi đổi MP)",
  "newSalt": "string (optional, hex 32 chars — khi đổi MP)"
}
```

**Responses:**

| Status | Body | Mô tả |
|---|---|---|
| `200` | `{"message": "Vault đã được cập nhật"}` | Cập nhật thông thường |
| `200` | `{"message": "Vault và Master Password đã được cập nhật"}` | Đổi MP thành công |
| `400` | `{"message": "Thiếu encryptedData"}` | Thiếu field |
| `400` | `{"message": "newAuthHash không hợp lệ..."}` | Hash format sai |
| `400` | `{"message": "newSalt không hợp lệ..."}` | Salt format sai |
| `401` | `{"message": "Thiếu token xác thực"}` | Không có JWT |
| `404` | `{"message": "Vault không tìm thấy"}` | Vault không tồn tại |
| `500` | `{"message": "Lỗi server khi cập nhật Vault"}` | Internal error |

**Ví dụ — Cập nhật thông thường:**

```bash
curl -X PUT http://localhost:3000/api/vault \
  -H "Authorization: Bearer eyJhbGci..." \
  -H "Content-Type: application/json" \
  -d '{"encryptedData": "bXlOZXdDaXBoZXJ0ZXh0..."}'
```

**Ví dụ — Đổi Master Password:**

```bash
curl -X PUT http://localhost:3000/api/vault \
  -H "Authorization: Bearer eyJhbGci..." \
  -H "Content-Type: application/json" \
  -d '{
    "encryptedData": "cmVFbmNyeXB0ZWRWYXVsdA==...",
    "newAuthHash": "new_sha256_hex_64_chars...",
    "newSalt": "new_hex_32_chars..."
  }'
```

> ⚠️ Khi đổi Master Password, server sử dụng **database transaction** để đảm bảo vault và user credentials được cập nhật đồng thời (atomicity).

---

### `GET /health`

Health check endpoint (không cần authentication).

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2025-03-15T10:30:00.000Z"
}
```

---

## Error Codes

| HTTP Status | Ý nghĩa |
|---|---|
| `200` | Thành công |
| `201` | Tạo mới thành công |
| `400` | Request không hợp lệ (thiếu field, sai format) |
| `401` | Xác thực thất bại (sai credentials, JWT invalid/expired, hoặc token đã bị thu hồi) |
| `404` | Resource không tìm thấy |
| `409` | Conflict (username đã tồn tại) |
| `429` | Too Many Requests — rate limit vượt quá (POST /api/login) |
| `500` | Internal server error |

---

## Validation Rules

| Field | Rule |
|---|---|
| `username` | 3-50 chars, regex: `^[A-Za-z0-9_\-\.]+$` |
| `authHash` | Exactly 64 hex chars, regex: `^[a-fA-F0-9]{64}$` |
| `newSalt` | Exactly 32 hex chars, regex: `^[a-fA-F0-9]{32}$` |
| `encryptedData` | Non-empty string, Base64 standard (`A-Za-z0-9+/` + `=` padding), length % 4 == 0 |

---

## CORS Policy

Server cho phép requests từ:
- `chrome-extension://<extension-id>` (Chrome Extension)
- `http://localhost:3000`, `http://localhost:5173` (development)

Các origin khác bị block bởi CORS middleware.
