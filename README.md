# 🔐 EasyPass — Zero-Knowledge Password Manager

<div align="center">

**Hệ thống Quản lý Mật khẩu Kiến trúc Zero-Knowledge**

Mọi thao tác mã hóa diễn ra 100% phía client — Server không bao giờ thấy mật khẩu của bạn.

[![Chrome Extension](https://img.shields.io/badge/Chrome-Manifest_V3-4285F4?logo=googlechrome&logoColor=white)](#)
[![Node.js](https://img.shields.io/badge/Node.js-v20-339933?logo=nodedotjs&logoColor=white)](#)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql&logoColor=white)](#)
[![AES-256-GCM](https://img.shields.io/badge/Crypto-AES--256--GCM-red)](#)
[![PBKDF2](https://img.shields.io/badge/KDF-PBKDF2_600k-orange)](#)
[![License](https://img.shields.io/badge/License-Academic-blue)](#)

</div>

---

## 📋 Mục lục

- [Giới thiệu](#-giới-thiệu)
- [Kiến trúc bảo mật](#-kiến-trúc-bảo-mật)
- [Công nghệ sử dụng](#-công-nghệ-sử-dụng)
- [Cấu trúc dự án](#-cấu-trúc-dự-án)
- [Cài đặt & Chạy](#-cài-đặt--chạy)
- [API Reference](#-api-reference)
- [Kiểm thử](#-kiểm-thử)
- [Tài liệu chi tiết](#-tài-liệu-chi-tiết)
- [Thông tin dự án](#-thông-tin-dự-án)

---

## 🌟 Giới thiệu

**EasyPass** là Chrome Extension quản lý mật khẩu cá nhân dựa trên kiến trúc **Zero-Knowledge**. Người dùng chỉ cần nhớ duy nhất một **Master Password** — toàn bộ mật khẩu được mã hóa trực tiếp trên trình duyệt bằng **AES-256-GCM** trước khi đồng bộ lên server.

### Tại sao cần EasyPass?

| Vấn đề | Giải pháp của EasyPass |
|---|---|
| 80% vi phạm dữ liệu liên quan đến mật khẩu tái sử dụng | Sinh mật khẩu ngẫu nhiên mạnh cho mỗi tài khoản |
| Trình quản lý mật khẩu truyền thống — server đọc được dữ liệu | **Zero-Knowledge**: server chỉ lưu bản mã, không thể giải mã |
| Lưu mật khẩu trong trình duyệt — dễ bị malware đánh cắp | Mã hóa AES-256-GCM với khóa chỉ tồn tại trong RAM |

### Tính năng chính

- 🔒 **Zero-Knowledge Encryption** — Server không bao giờ thấy Master Password hay dữ liệu gốc
- 🔑 **PBKDF2-SHA256** (600,000 iterations) — Dẫn xuất khóa mã hóa an toàn theo khuyến nghị OWASP 2023
- 🛡️ **AES-256-GCM** — Mã hóa xác thực toàn bộ Vault (confidentiality + integrity)
- ⚡ **Auto-fill** — Tự động điền thông tin đăng nhập trên trang web
- 🎲 **Password Generator** — Sinh mật khẩu ngẫu nhiên mật mã (8–64 ký tự)
- 🔄 **Cloud Sync** — Đồng bộ bản mã qua REST API
- 📱 **Quick Unlock** — Mở lại Extension không cần nhập lại Master Password trong phiên trình duyệt
- 🔐 **Change Master Password** — Đổi mật khẩu chính với tái mã hóa toàn bộ Vault

---

## 🏗️ Kiến trúc bảo mật

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLIENT (Trình duyệt Chrome)                 │
│                                                                 │
│  Master Password ──┬──► SHA-256 ──► auth_hash (h) ──────────┐  │
│        (MP)        │                                         │  │
│                    └──► PBKDF2-SHA256 ──► Master Key (MK)    │  │
│                          (600k iters)         │              │  │
│                                               │              │  │
│  Vault (JSON) ──► AES-256-GCM Encrypt ◄──────┘              │  │
│       (M)              │                                     │  │
│                        ▼                                     │  │
│              Ciphertext (C) + GCM Tag                        │  │
│                        │                                     │  │
└────────────────────────┼─────────────────────────────────────┘  │
                         │ HTTPS                                   │
┌────────────────────────┼─────────────────────────────────────────┘
│                 SERVER (Node.js + MySQL)                         │
│                                                                 │
│  Lưu trữ: { user_id, username, auth_hash, salt, ciphertext }   │
│  ⚠️  Server KHÔNG CÓ: Master Password, Master Key, Plaintext    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

> **Nguyên tắc Zero-Knowledge:** Ngay cả khi server bị xâm phạm hoàn toàn, kẻ tấn công chỉ thu được bản mã `C` — không thể giải mã nếu không có Master Password.

---

## 🛠️ Công nghệ sử dụng

| Tầng | Công nghệ | Vai trò |
|---|---|---|
| **UI** | React 18 + Vite 5 | Giao diện Chrome Extension popup |
| **Mật mã** | Web Crypto API | PBKDF2, AES-256-GCM, SHA-256 (browser built-in) |
| **Extension** | Chrome Manifest V3 | Service Worker, Content Script, Storage API |
| **Backend** | Node.js 20 + Express 4 | REST API, JWT Authentication |
| **Database** | MySQL 8.0 | Lưu trữ user, auth_hash, salt, ciphertext |
| **DevOps** | Docker + Docker Compose | Containerize backend + database |
| **Testing** | Vitest (frontend) + Jest (backend) | Unit tests cho crypto & API |

---

## 📁 Cấu trúc dự án

```
.
├── extension/                    # Chrome Extension (Client-side)
│   ├── manifest.json             # Chrome Manifest V3 configuration
│   ├── popup.html                # Extension popup entry point
│   ├── background/
│   │   └── service-worker.js     # Session management (chrome.storage)
│   ├── content/
│   │   └── content.js            # Auto-fill script (inject vào web pages)
│   ├── modules/
│   │   ├── auth.js               # authenticate(), register(), fetchVault(), logout()
│   │   ├── crypto.js             # deriveKey(), encryptVault(), decryptVault(), computeAuthHash()
│   │   ├── vault-manager.js      # CRUD operations on VaultData (RAM only)
│   │   ├── sync.js               # syncVault() — PUT ciphertext lên server
│   │   └── utils.js              # generatePassword(), copyToClipboard(), formatDate()
│   ├── src/
│   │   ├── App.jsx               # Root component, routing, global state
│   │   ├── main.jsx              # React entry point
│   │   ├── index.css             # Design system & styles
│   │   ├── views/                # Các màn hình chính
│   │   │   ├── LoginView.jsx     # Đăng nhập
│   │   │   ├── RegisterView.jsx  # Đăng ký
│   │   │   ├── VaultView.jsx     # Danh sách mật khẩu
│   │   │   ├── AddEntryView.jsx  # Thêm mục mới
│   │   │   ├── EditEntryView.jsx # Chỉnh sửa mục
│   │   │   ├── GeneratorView.jsx # Sinh mật khẩu ngẫu nhiên
│   │   │   ├── SettingsView.jsx  # Cài đặt & Đổi Master Password
│   │   │   └── QuickUnlockView.jsx # Mở khóa nhanh
│   │   ├── components/           # UI components tái sử dụng
│   │   │   ├── EntryCard.jsx     # Card hiển thị mục mật khẩu
│   │   │   ├── PasswordInput.jsx # Input mật khẩu ẩn/hiện
│   │   │   ├── PasswordStrengthBar.jsx
│   │   │   ├── CategoryBadge.jsx
│   │   │   └── Toast.jsx         # Thông báo
│   │   └── hooks/                # Custom React hooks
│   │       ├── useSession.js     # Quản lý phiên đăng nhập
│   │       ├── useVault.js       # CRUD + encrypt + sync
│   │       └── useToast.js       # Notification state
│   └── tests/                    # Vitest unit tests
│       ├── crypto.test.js        # Test PBKDF2, AES-256-GCM
│       └── PasswordInput.test.jsx
│
├── server/                       # Backend REST API (Server-side)
│   ├── app.js                    # Express entry point, middleware, routes
│   ├── package.json
│   ├── Dockerfile                # Production container (node:20-alpine)
│   ├── .env.example              # Environment variables template
│   ├── routes/
│   │   ├── auth.routes.js        # POST /register, POST /login
│   │   └── vault.routes.js       # GET /vault, PUT /vault
│   ├── middleware/
│   │   └── jwt.middleware.js     # JWT Bearer token verification
│   ├── db/
│   │   └── schema.sql            # DDL: CREATE TABLE USER, VAULT
│   └── tests/                    # Jest + Supertest
│       ├── auth.test.js          # Test đăng ký, đăng nhập, JWT
│       └── vault.test.js         # Test CRUD vault API
│
├── docker-compose.yml            # Orchestrate: MySQL 8 + Node.js server
├── docs/                         # Tài liệu dự án
│   ├── ARCHITECTURE.md           # Kiến trúc bảo mật chi tiết
│   ├── API.md                    # API Reference đầy đủ
│   ├── SETUP.md                  # Hướng dẫn cài đặt chi tiết
│   └── CONTRIBUTING.md           # Hướng dẫn phát triển
└── .gitignore
```

---

## 🚀 Cài đặt & Chạy

### Yêu cầu hệ thống

- **Docker Desktop** (hoặc Docker Engine + Compose)
- **Node.js v18+** (để build Extension)
- **Google Chrome** (để cài Extension)

### 1. Clone repository

```bash
git clone https://github.com/<your-username>/easypass.git
cd easypass
```

### 2. Khởi động Backend (Docker)

```bash
docker compose up -d --build
```

Hệ thống sẽ khởi động:
- **MySQL 8.0** trên port `3306` (tự động chạy `schema.sql`)
- **Node.js API** trên port `3000`

Kiểm tra:
```bash
curl http://localhost:3000/health
# → {"status":"ok","timestamp":"..."}
```

### 3. Build Chrome Extension

```bash
cd extension
npm install
npm run build
```

### 4. Cài Extension vào Chrome

1. Mở `chrome://extensions/`
2. Bật **Developer Mode** (góc phải trên)
3. Click **Load unpacked** → chọn thư mục `extension/` (bao gồm cả `dist/`, `background/`, `content/`, `modules/`)
4. Click icon 🔐 EasyPass trên toolbar để bắt đầu

> 📖 Xem hướng dẫn chi tiết tại [docs/SETUP.md](docs/SETUP.md)

---

## 🌐 API Reference

Base URL: `http://localhost:3000`

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| `POST` | `/api/register` | Đăng ký tài khoản mới (tạo User + Vault rỗng) | — |
| `POST` | `/api/login` | Xác thực bằng `authHash`, trả về JWT + Salt | — |
| `GET` | `/api/vault` | Lấy bản mã Vault (ciphertext) | 🔒 JWT |
| `PUT` | `/api/vault` | Cập nhật bản mã mới / Đổi Master Password | 🔒 JWT |
| `GET` | `/health` | Health check | — |

### Ví dụ nhanh

```bash
# Đăng ký
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"demo","authHash":"<sha256-hex-64-chars>"}'

# Đăng nhập
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"demo","authHash":"<sha256-hex-64-chars>"}'
# → {"token":"eyJhbGci...","salt":"a1b2c3...","userId":"uuid-..."}

# Lấy Vault
curl http://localhost:3000/api/vault \
  -H "Authorization: Bearer <jwt-token>"
```

> 📖 Xem API Reference đầy đủ tại [docs/API.md](docs/API.md)

---

## 🧪 Kiểm thử

### Frontend (Vitest)

```bash
cd extension
npm run test
```

| Test suite | Nội dung |
|---|---|
| `crypto.test.js` | PBKDF2 key derivation, AES-256-GCM encrypt/decrypt roundtrip |
| `PasswordInput.test.jsx` | Component ẩn/hiện mật khẩu, render đúng |

### Backend (Jest + Supertest)

```bash
cd server
npm run test
```

| Test suite | Nội dung |
|---|---|
| `auth.test.js` | Register validation, login flow, JWT generation |
| `vault.test.js` | GET/PUT vault, authorization, error handling |

---

## 📚 Tài liệu chi tiết

| Tài liệu | Mô tả |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Kiến trúc Zero-Knowledge, luồng mật mã, mô hình bảo mật |
| [docs/API.md](docs/API.md) | API Reference đầy đủ với request/response schemas |
| [docs/SETUP.md](docs/SETUP.md) | Hướng dẫn cài đặt chi tiết & troubleshooting |
| [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) | Quy tắc phát triển, coding conventions |

---

## 🛡️ Thông số bảo mật

| Thuật toán | Thông số | Mục đích |
|---|---|---|
| **PBKDF2-SHA256** | 600,000 iterations, 16-byte salt | Dẫn xuất Master Key từ Master Password |
| **AES-256-GCM** | 256-bit key, 96-bit IV, 128-bit tag | Mã hóa xác thực toàn bộ Vault |
| **SHA-256** | 256-bit output | Tạo auth_hash để xác thực với server |
| **JWT** | HS256, 1h expiry | Session token cho API authentication |
| **CSPRNG** | `crypto.getRandomValues()` | Sinh IV, salt, mật khẩu ngẫu nhiên |

---

## ℹ️ Thông tin dự án

| | |
|---|---|
| **Sinh viên** | Nguyễn Khắc Viễn |
| **MSSV** | 22127491 |
| **Môn học** | Đồ án Mã hóa ứng dụng và An ninh thông tin |
| **Trường** | ĐH Khoa học Tự nhiên — ĐHQG TP.HCM |

---

<div align="center">
<sub>Built with 🔒 Zero-Knowledge Architecture — Your passwords, your keys, your control.</sub>
</div>
