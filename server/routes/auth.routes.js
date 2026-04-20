// ============================================================
//  Auth Routes
//  POST /api/register  -- Tạo tài khoản mới
//  POST /api/login     -- Xác thực, trả về JWT + salt
// ============================================================

const { Router } = require("express");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const jwtMiddleware = require("../middleware/jwt.middleware");

const router = Router();
const SECRET = process.env.JWT_SECRET;
if (!SECRET) throw new Error('JWT_SECRET environment variable is required');
const EXPIRES = process.env.JWT_EXPIRES_IN || "1h";

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Quá nhiều yêu cầu đăng nhập, vui lòng thử lại sau" },
});

// ---- POST /api/register ----
router.post("/register", async (req, res) => {
  const db = req.app.get("db");
  const { username, authHash } = req.body;

  // --- Validation ---
  if (!username || !authHash) {
    return res.status(400).json({ message: "Thiếu username hoặc authHash" });
  }
  if (!/^[A-Za-z0-9_\-\.]{3,50}$/.test(username)) {
    return res.status(400).json({
      message: "Username chỉ được chứa chữ, số, dấu gạch (3-50 ký tự)",
    });
  }
  if (typeof authHash !== "string" || !/^[a-fA-F0-9]{64}$/.test(authHash)) {
    return res.status(400).json({
      message: "authHash không hợp lệ (phải là SHA-256 hex, 64 chars)",
    });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // --- Check duplicate ---
    const [rows] = await connection.execute(
      "SELECT user_id FROM USER WHERE username = ?",
      [username],
    );
    if (rows.length > 0) {
      await connection.rollback();
      connection.release();
      return res.status(409).json({ message: "Tên đăng nhập đã tồn tại" });
    }

    // --- Create user ---
    const userId = crypto.randomUUID();
    const salt = crypto.randomBytes(16).toString("hex"); // 32 hex chars

    await connection.execute(
      "INSERT INTO USER (user_id, username, auth_hash, salt) VALUES (?, ?, ?, ?)",
      [userId, username, authHash, salt],
    );

    // --- Create empty vault for the new user ---
    const vaultId = crypto.randomUUID();
    await connection.execute(
      "INSERT INTO VAULT (vault_id, user_id, encrypted_data) VALUES (?, ?, ?)",
      [vaultId, userId, ""],
    );

    await connection.commit();
    connection.release();

    return res.status(201).json({ userId, message: "Đăng ký thành công" });
  } catch (err) {
    await connection.rollback();
    connection.release();
    console.error("Register error:", err);
    return res.status(500).json({ message: "Lỗi server khi đăng ký" });
  }
});

// ---- POST /api/login ----
router.post("/login", loginLimiter, async (req, res) => {
  const db = req.app.get("db");
  const { username, authHash } = req.body;

  // --- Validation ---
  if (!username || !authHash) {
    return res.status(400).json({ message: "Thiếu username hoặc authHash" });
  }
  if (typeof authHash !== "string" || !/^[a-fA-F0-9]{64}$/.test(authHash)) {
    return res.status(400).json({
      message: "authHash không hợp lệ (phải là SHA-256 hex, 64 chars)",
    });
  }

  try {
    const [rows] = await db.execute(
      "SELECT user_id, auth_hash, salt FROM USER WHERE username = ?",
      [username],
    );

    // Constant-time compare to reduce timing side-channel risk
    const user = rows[0];
    const storedHash = user ? user.auth_hash : "0".repeat(64);

    const storedBuf = Buffer.from(storedHash, "hex");
    const inputBuf = Buffer.from(authHash, "hex");
    const hashMatched =
      storedBuf.length === inputBuf.length &&
      crypto.timingSafeEqual(storedBuf, inputBuf);

    if (!user || !hashMatched) {
      return res
        .status(401)
        .json({ message: "Sai tên đăng nhập hoặc mật khẩu" });
    }
    const token = jwt.sign({ userId: user.user_id }, SECRET, {
      expiresIn: EXPIRES,
      jwtid: crypto.randomUUID(),
    });

    return res.status(200).json({
      token,
      salt: user.salt,
      userId: user.user_id,
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Lỗi server khi đăng nhập" });
  }
});

// ---- POST /api/logout ----
router.post("/logout", jwtMiddleware, async (req, res) => {
  const db = req.app.get("db");
  const { jti, exp } = req.user;
  const userId = req.user.id;

  try {
    const expiresAt = new Date(exp * 1000);
    await db.execute(
      "INSERT IGNORE INTO TOKEN_BLACKLIST (jti, user_id, expires_at) VALUES (?, ?, ?)",
      [jti, userId, expiresAt]
    );
    return res.status(200).json({ message: "Đăng xuất thành công" });
  } catch (err) {
    console.error("Logout error:", err);
    return res.status(500).json({ message: "Lỗi server khi đăng xuất" });
  }
});

module.exports = router;
