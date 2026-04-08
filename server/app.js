// ============================================================
//  EasyPass Server -- Entry Point
//  Express REST API with JWT authentication
// ============================================================

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const authRoutes = require("./routes/auth.routes");
const vaultRoutes = require("./routes/vault.routes");
const jwtMiddleware = require("./middleware/jwt.middleware");

const app = express();

// ---- Middleware ----
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser/extension requests without Origin (e.g., curl, health checks)
      if (!origin) return callback(null, true);

      // Allow Chrome Extension origins: chrome-extension://<extension-id>
      if (/^chrome-extension:\/\/[a-p]{32}$/.test(origin)) {
        return callback(null, true);
      }

      // Allow local web clients used during development
      const allowedWebOrigins = new Set([
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
      ]);

      if (allowedWebOrigins.has(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json({ limit: "5mb" }));

// ---- MySQL Connection Pool ----
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "easypass_user",
  password: process.env.DB_PASSWORD || "easypass_pass",
  database: process.env.DB_NAME || "easypass",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Attach pool to app so routes can access it
app.set("db", pool);

// ---- Routes ----
// Public routes: register / login
app.use("/api", authRoutes);

// Protected routes: vault (requires valid JWT)
app.use("/api", jwtMiddleware, vaultRoutes);

// ---- Health Check ----
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ---- 404 Handler ----
app.use((req, res) => {
  res.status(404).json({ message: "Route không tồn tại" });
});

// ---- Global Error Handler ----
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal server error" });
});

// ---- Start Server ----
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  try {
    const conn = await pool.getConnection();
    conn.release();
    console.log(`✅ Database connected`);
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
  }
  console.log(`🚀 EasyPass Server running on http://localhost:${PORT}`);
});

module.exports = app;
