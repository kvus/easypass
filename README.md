# EasyPass — Hệ thống Quản lý Mật khẩu Zero-Knowledge

## Cấu trúc thư mục

```
source/
├── docker-compose.yml         ← Dựng MySQL + Server
├── extension/                 ← Chrome Extension (Manifest V3)
│   ├── manifest.json
│   ├── background/service-worker.js
│   ├── content/content.js
│   ├── modules/
│   │   ├── crypto.js          ← PBKDF2 + AES-256-GCM
│   │   ├── auth.js            ← Login / Register / Logout
│   │   ├── vault-manager.js   ← CRUD trên VaultData (RAM)
│   │   ├── sync.js            ← PUT /api/vault
│   │   └── utils.js           ← Password generator, clipboard...
│   └── popup/
│       ├── popup.html
│       ├── popup.css
│       └── popup.js
└── server/                    ← Node.js + Express REST API
    ├── Dockerfile
    ├── app.js
    ├── db/schema.sql
    ├── routes/
    │   ├── auth.routes.js     ← POST /register, /login
    │   └── vault.routes.js    ← GET/PUT /vault
    └── middleware/
        └── jwt.middleware.js
```

---

## Hướng dẫn chạy

### Yêu cầu
- Docker + Docker Compose
- Google Chrome / Chromium

### Bước 1 — Dựng server + database

```bash
cd source/
docker-compose up -d
```

Kiểm tra server đang chạy:
```bash
curl http://localhost:3000/health
# → {"status":"ok","timestamp":"..."}
```

### Bước 2 — Load Extension vào Chrome

1. Mở Chrome → `chrome://extensions`
2. Bật **Developer mode** (góc trên phải)
3. Click **Load unpacked**
4. Chọn thư mục `source/extension/`
5. Extension **EasyPass** sẽ xuất hiện trên thanh toolbar

### Bước 3 — Test

1. Click icon EasyPass → **Đăng ký** tài khoản mới
2. **Đăng nhập** với Master Password vừa tạo
3. Thêm mục mật khẩu → Vault tự động mã hóa + đồng bộ lên server

### Dừng server
```bash
docker-compose down
# Giữ dữ liệu DB: docker-compose down (không xóa volume)
# Xóa sạch DB:    docker-compose down -v
```

---

## Kiến trúc bảo mật (Zero-Knowledge)

| Thao tác | Xảy ra ở đâu |
|---|---|
| Tính auth_hash = SHA-256(MP) | Client (Extension) |
| Sinh Master Key = PBKDF2(MP, salt) | Client (Extension) |
| Mã hóa Vault = AES-256-GCM(VaultData, MK) | Client (Extension) |
| Lưu ciphertext (không đọc được) | Server (MySQL) |
| Server không bao giờ thấy MP, MK, hay bản rõ | ✅ |

---

## API Endpoints

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| POST | `/api/register` | Đăng ký tài khoản | ❌ |
| POST | `/api/login` | Đăng nhập, nhận JWT | ❌ |
| GET  | `/api/vault` | Lấy ciphertext | JWT |
| PUT  | `/api/vault` | Cập nhật ciphertext | JWT |
| GET  | `/health` | Kiểm tra server | ❌ |
