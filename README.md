# 🔐 EasyPass — Hệ thống Quản lý Mật khẩu Zero-Knowledge

**Sinh viên thực hiện:** Nguyễn Khắc Viễn  
**Mã số sinh viên:** 22127491  
**Môn học:** Đồ án Mã hóa ứng dụng và an ninh thông tin  

---

## 🌟 Giới thiệu

**EasyPass** là giải pháp quản lý mật khẩu an toàn dựa trên nguyên lý **Zero-Knowledge**. Hệ thống đảm bảo mọi thao tác mã hóa và giải mã đều diễn ra hoàn toàn tại trình duyệt người dùng. Server chỉ đóng vai trò lưu giữ bản mã và không bao giờ biết được thông tin nhạy cảm của bạn.

## 📁 Cấu trúc thư mục (GitHub Repository)

```text
.
├── extension/          # Giao diện Chrome Extension (React 18 + Vite)
│   ├── background/     # Service Worker quản lý session
│   ├── content/        # Content script thực hiện auto-fill
│   ├── modules/        # Các module mật mã (AES, PBKDF2) và tiện ích
│   ├── src/            # Giao diện React (App, Views, Components, Hooks)
│   └── manifest.json   # Cấu hình Chrome Extension (MV3)
├── server/             # Backend REST API (Node.js + Express)
│   ├── routes/         # Định nghĩa các API endpoints
│   ├── middleware/     # Xác thực JWT
│   └── db/             # Cấu trúc cơ sở dữ liệu (MySQL SQL)
└── docker-compose.yml  # File khởi động toàn bộ hệ thống (DB + Server)
```

> [!NOTE]
> Các tệp báo cáo chi tiết **Phase 1 - Phase 4** (PDF) được lưu trữ tại thư mục cha bên ngoài Kho lưu trữ này để đảm bảo Repo mã nguồn tập trung và gọn nhẹ.

## 🚀 Hướng dẫn cài đặt nhanh

### 1. Khởi động Backend (Docker)
Yêu cầu: Docker Desktop hoặc Docker Engine.

```bash
# Chạy tại thư mục gốc của Repo
docker compose up -d --build
```
Hệ thống sẽ chạy tại `http://localhost:3000`. Bạn có thể kiểm tra qua `curl http://localhost:3000/health`.

### 2. Biên dịch Extension
Yêu cầu: Node.js v18+.

```bash
cd extension
npm install
npm run build
```
Thư mục `dist/` sẽ được tạo ra.

### 3. Cài đặt vào Chrome
1. Truy cập `chrome://extensions/`.
2. Bật **Developer Mode**.
3. Chọn **Load unpacked** và trỏ đến thư mục `extension/dist`.

## 🌐 API Reference

Hệ thống Backend cung cấp các RESTful API sau (Base URL: `http://localhost:3000`):

| Method | Endpoint | Mô tả | Authentication |
|---|---|---|---|
| `POST` | `/api/register` | Đăng ký tài khoản (Tạo User & Vault rỗng) | Không |
| `POST` | `/api/login` | Xác thực người dùng, trả về JWT và Salt | Không |
| `GET` | `/api/vault` | Lấy dữ liệu mã hóa (Ciphertext) | **JWT Bearer** |
| `PUT` | `/api/vault` | Cập nhật dữ liệu mã hóa mới lên Server | **JWT Bearer** |
| `GET` | `/health` | Kiểm tra trạng thái hoạt động của Server | Không |

## 🧪 Chiến lược Kiểm thử (Testing)

Dự án đạt độ tin cậy cao nhờ hệ thống Unit Test tự động cho cả 2 phía:

### 1. Frontend (Vitest & React Testing Library)
- **Mật mã học**: Kiểm tra tính chính xác của thuật toán PBKDF2 (Dẫn xuất khóa) và AES-256-GCM (Mã hóa/Giải mã).
- **Giao diện**: Đảm bảo các Form nhập liệu, Strength bar mật khẩu và các Hook (`useVault`, `useSession`) hoạt động đúng context.
- **Lệnh chạy**: `npm run test` tại thư mục `extension`.

### 2. Backend (Jest & Supertest)
- **Xác thực**: Kiểm tra tính đúng đắn của JWT Middleware và quá trình đăng ký/đăng nhập.
- **Dữ liệu**: Đảm bảo lỗi được xử lý đúng khi gửi dữ liệu không hợp lệ hoặc thiếu Token.
- **Lệnh chạy**: `npm run test` tại thư mục `server`.

## 🛡️ Kiến trúc bảo mật
- **PBKDF2**: Dẫn xuất khóa từ Master Password (100,000 rounds).
- **AES-256-GCM**: Mã hóa xác thực toàn bộ Vault.
- **SHA-256**: Băm mật khẩu (auth_hash) để xác thực với Server.
- **Zero-Knowledge**: Server không thể giải mã dữ liệu người dùng.

---
*Dành cho Đồ án môn học tại Trường ĐH Khoa học Tự nhiên.*
