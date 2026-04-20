# ⚙️ Hướng dẫn cài đặt chi tiết — EasyPass

## Mục lục

- [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
- [Cài đặt Backend (Docker)](#1-cài-đặt-backend-docker)
- [Cài đặt Backend (Manual)](#2-cài-đặt-backend-manual-không-dùng-docker)
- [Build Chrome Extension](#3-build-chrome-extension)
- [Cài Extension vào Chrome](#4-cài-extension-vào-chrome)
- [Biến môi trường](#5-biến-môi-trường)
- [Troubleshooting](#6-troubleshooting)

---

## Yêu cầu hệ thống

| Phần mềm | Phiên bản | Bắt buộc? |
|---|---|---|
| Docker Desktop | 4.x+ | ✅ (hoặc Docker Engine + Compose) |
| Node.js | 18+ (khuyến nghị 20 LTS) | ✅ (để build Extension) |
| npm | 9+ | ✅ |
| Google Chrome | 116+ (Manifest V3) | ✅ |
| MySQL | 8.0 (nếu không dùng Docker) | Tùy chọn |

---

## 1. Cài đặt Backend (Docker)

Cách nhanh nhất — chỉ cần Docker.

### Bước 1: Clone repo

```bash
git clone https://github.com/<your-username>/easypass.git
cd easypass
```

### Bước 2: Khởi động containers

```bash
docker compose up -d --build
```

Docker Compose sẽ tạo 2 containers:

| Container | Image | Port | Vai trò |
|---|---|---|---|
| `easypass_db` | `mysql:8.0` | `3306` | Database, tự động chạy `schema.sql` |
| `easypass_server` | Node.js 20 Alpine | `3000` | REST API server |

### Bước 3: Kiểm tra

```bash
# Health check
curl http://localhost:3000/health
# → {"status":"ok","timestamp":"..."}

# Xem logs
docker compose logs -f server

# Kiểm tra database
docker exec -it easypass_db mysql -u easypass_user -peasypass_pass -D easypass -e "SHOW TABLES;"
# → USER, VAULT
```

### Bước 4: Dừng / Xóa

```bash
# Dừng
docker compose down

# Dừng + xóa data (reset database)
docker compose down -v
```

---

## 2. Cài đặt Backend (Manual — không dùng Docker)

### Bước 1: Cài MySQL 8.0

```bash
# Ubuntu/Debian
sudo apt install mysql-server-8.0

# macOS (Homebrew)
brew install mysql@8.0

# Khởi động
sudo systemctl start mysql
```

### Bước 2: Tạo database

```bash
mysql -u root -p < server/db/schema.sql
```

Hoặc tự tạo user:

```sql
CREATE USER 'easypass_user'@'localhost' IDENTIFIED BY 'easypass_pass';
GRANT ALL PRIVILEGES ON easypass.* TO 'easypass_user'@'localhost';
FLUSH PRIVILEGES;
```

### Bước 3: Cấu hình environment

```bash
cd server
cp .env.example .env
# Chỉnh sửa .env nếu cần (DB_HOST, mật khẩu, JWT_SECRET)
```

### Bước 4: Cài dependencies và chạy

```bash
npm install

# Development (hot reload)
npm run dev

# Production
npm start
```

Server chạy tại `http://localhost:3000`.

---

## 3. Build Chrome Extension

```bash
cd extension
npm install
npm run build
```

Sau khi build xong, thư mục `dist/` được tạo chứa các file HTML/JS/CSS đã bundle.

> **Development mode:** Dùng `npm run dev` để chạy Vite dev server (chỉ phục vụ cho việc phát triển UI, không dùng cho Chrome Extension thực tế).

---

## 4. Cài Extension vào Chrome

### Bước 1
Mở Chrome, truy cập `chrome://extensions/`

### Bước 2
Bật **Developer mode** (toggle góc phải trên)

### Bước 3
Click **"Load unpacked"** và chọn **thư mục `extension/`** (thư mục gốc của extension, KHÔNG phải thư mục `dist/`)

> ⚠️ Phải chọn thư mục `extension/` vì Chrome cần đọc `manifest.json` ở root, cùng với `background/`, `content/`, `modules/`, và `dist/`.

### Bước 4
Extension sẽ xuất hiện trên toolbar. Click icon 🔐 **EasyPass** để bắt đầu.

### Bước 5 — Kiểm tra

1. Click extension → Chọn **"Đăng ký"** → Tạo tài khoản mới
2. Đăng nhập bằng Master Password
3. Thêm mục mật khẩu đầu tiên
4. Truy cập một trang web → kiểm tra auto-fill

---

## 5. Biến môi trường

File `.env` (trong thư mục `server/`):

```bash
# Server
PORT=3000                    # Port cho API server
NODE_ENV=development         # development | production

# Database (MySQL)
DB_HOST=localhost             # Hoặc 'db' nếu dùng Docker
DB_PORT=3306
DB_USER=easypass_user
DB_PASSWORD=easypass_pass
DB_NAME=easypass

# JWT
JWT_SECRET=your_random_secret_here   # ⚠️ ĐỔI trong production!
JWT_EXPIRES_IN=1h                    # Token expiry time
```

> ⚠️ **PRODUCTION:** Luôn đổi `JWT_SECRET` thành chuỗi ngẫu nhiên dài (32+ ký tự).

---

## 6. Database Schema

EasyPass sử dụng 3 bảng:

| Bảng | Mô tả |
|------|-------|
| `USER` | Thông tin tài khoản: `user_id`, `username`, `auth_hash`, `salt` |
| `VAULT` | Ciphertext vault: `vault_id`, `user_id`, `encrypted_data` |
| `TOKEN_BLACKLIST` | JWT đã bị thu hồi: `jti`, `user_id`, `expires_at` |

Schema được tự động khởi tạo khi Docker Compose chạy lần đầu. Nếu cần **reset toàn bộ dữ liệu** (vd. sau khi thay đổi schema):

```bash
docker compose down -v   # Xóa volume DB
docker compose up -d --build   # Tạo lại từ đầu
```

---

## 7. Troubleshooting

### ❌ "Không thể kết nối server"

**Nguyên nhân:** Backend chưa chạy hoặc sai port.

```bash
# Kiểm tra container đang chạy
docker ps

# Kiểm tra logs
docker compose logs server

# Kiểm tra port
curl http://localhost:3000/health
```

### ❌ "CORS blocked for origin"

**Nguyên nhân:** Extension ID không được whitelist.

Extension origin có dạng `chrome-extension://<32-char-id>`. Server đã tự động chấp nhận tất cả chrome-extension origins. Nếu vẫn bị block, kiểm tra `app.js` phần CORS config.

### ❌ "Database connection failed"

**Nguyên nhân:** MySQL chưa sẵn sàng hoặc credentials sai.

```bash
# Docker: Kiểm tra DB đã healthy chưa
docker ps  # Xem cột STATUS

# Manual: Test kết nối
mysql -u easypass_user -peasypass_pass -D easypass -e "SELECT 1;"
```

### ❌ "Token đã hết hạn"

**Nguyên nhân:** JWT có thời hạn 1 giờ. Sau 1 giờ cần đăng nhập lại.

Tăng thời hạn trong `.env`:
```
JWT_EXPIRES_IN=24h
```

### ❌ "Token đã bị thu hồi"

**Nguyên nhân:** Token đã bị blacklist sau khi đăng xuất. Đây là hoạt động bình thường của cơ chế bảo mật.

Giải pháp: Đăng nhập lại để nhận JWT mới.

> ℹ️ Server lưu JWT đã logout trong bảng `TOKEN_BLACKLIST`. Bảng này tự động bao gồm `expires_at` để có thể dọn dẹp các dòng hết hạn bằng lệnh:
> ```sql
> DELETE FROM TOKEN_BLACKLIST WHERE expires_at < NOW();
> ```

### ❌ "Quá nhiều yêu cầu đăng nhập" (429)

**Nguyên nhân:** Rate limiting — tối đa **10 lần đăng nhập/phút** per IP.

Giải pháp: Chờ 1 phút rồi thử lại. Nếu cần tăng giới hạn trong môi trường dev, sửa `windowMs` và `max` trong `server/routes/auth.routes.js`.

### ❌ Extension không hiện popup

**Nguyên nhân:** Chưa build hoặc chọn sai thư mục.

```bash
# Build lại
cd extension && npm run build

# Reload extension
# chrome://extensions/ → Click 🔄 (reload) trên EasyPass card
```

### ❌ Auto-fill không hoạt động

**Nguyên nhân:** Content script cần `activeTab` permission và trang web phải có form login hợp lệ.

Đảm bảo:
1. Extension có permission `activeTab` + `scripting` (đã có trong manifest.json)
2. Trang web có `<input type="password">`
3. Mục mật khẩu trong Vault có `siteUrl` khớp với domain hiện tại
