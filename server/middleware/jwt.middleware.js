// ============================================================
//  JWT Middleware
//  Verifies Bearer token on protected routes
// ============================================================

const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_change_in_production';

/**
 * Middleware: verify JWT in Authorization header
 * Sets req.user = { id: userId } on success
 */
function jwtMiddleware(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Thiếu token xác thực' });
  }

  const token = header.split(' ')[1];

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = { id: decoded.userId };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token đã hết hạn, vui lòng đăng nhập lại' });
    }
    return res.status(401).json({ message: 'Token không hợp lệ' });
  }
}

module.exports = jwtMiddleware;
