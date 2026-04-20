// ============================================================
//  JWT Middleware
//  Verifies Bearer token on protected routes
// ============================================================

const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_change_in_production';

/**
 * Middleware: verify JWT in Authorization header, then check token blacklist.
 * Sets req.user = { id, jti, exp } on success.
 */
async function jwtMiddleware(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Thiếu token xác thực' });
  }

  const token = header.split(' ')[1];

  try {
    const decoded = jwt.verify(token, SECRET);

    // Check if token has been revoked (logout blacklist)
    const db = req.app.get('db');
    const [rows] = await db.execute(
      'SELECT 1 FROM TOKEN_BLACKLIST WHERE jti = ?',
      [decoded.jti]
    );
    if (rows.length > 0) {
      return res.status(401).json({ message: 'Token đã bị thu hồi, vui lòng đăng nhập lại' });
    }

    req.user = { id: decoded.userId, jti: decoded.jti, exp: decoded.exp };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token đã hết hạn, vui lòng đăng nhập lại' });
    }
    return res.status(401).json({ message: 'Token không hợp lệ' });
  }
}

module.exports = jwtMiddleware;
