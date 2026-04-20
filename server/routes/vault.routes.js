// ============================================================
//  Vault Routes  (requires JWT middleware applied before these)
//  GET  /api/vault  -- Lấy encrypted vault của user
//  PUT  /api/vault  -- Ghi đè encrypted vault mới
//                      (Hỗ trợ cả change-password: newAuthHash + newSalt)
// ============================================================

const { Router } = require('express');
const router = Router();

// ---- GET /api/vault ----
router.get('/vault', async (req, res) => {
  const db     = req.app.get('db');
  const userId = req.user.id; // set by jwtMiddleware

  try {
    const [rows] = await db.execute(
      'SELECT encrypted_data, updated_at FROM VAULT WHERE user_id = ?',
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Vault không tồn tại' });
    }

    // Server returns ciphertext as-is — NEVER reads/parses content (Zero-Knowledge)
    return res.status(200).json({
      encryptedData: rows[0].encrypted_data,
      updatedAt:     rows[0].updated_at
    });
  } catch (err) {
    console.error('Get vault error:', err);
    return res.status(500).json({ message: 'Lỗi server khi lấy Vault' });
  }
});

// ---- PUT /api/vault ----
// Body: { encryptedData: string, newAuthHash?: string, newSalt?: string }
// newAuthHash + newSalt chỉ có khi user đổi Master Password
router.put('/vault', async (req, res) => {
  const db            = req.app.get('db');
  const userId        = req.user.id;
  const { encryptedData, newAuthHash, newSalt } = req.body;

  if (encryptedData === undefined) {
    return res.status(400).json({ message: 'Thiếu encryptedData' });
  }
  if (typeof encryptedData !== 'string' || encryptedData.length === 0) {
    return res.status(400).json({ message: 'encryptedData phải là chuỗi Base64 không rỗng' });
  }
  // Standard Base64: A-Za-z0-9+/ with up to 2 = padding, length divisible by 4
  if (!/^[A-Za-z0-9+/]+=*$/.test(encryptedData) || encryptedData.length % 4 !== 0) {
    return res.status(400).json({ message: 'encryptedData không phải định dạng Base64 hợp lệ' });
  }

  // Validate change-password fields nếu có
  const isChangingPassword = newAuthHash !== undefined || newSalt !== undefined;
  if (isChangingPassword) {
    if (typeof newAuthHash !== 'string' || !/^[a-fA-F0-9]{64}$/.test(newAuthHash)) {
      return res.status(400).json({ message: 'newAuthHash không hợp lệ (phải là SHA-256 hex, 64 chars)' });
    }
    if (typeof newSalt !== 'string' || !/^[a-fA-F0-9]{32}$/.test(newSalt)) {
      return res.status(400).json({ message: 'newSalt không hợp lệ (phải là hex, 32 chars)' });
    }
  }

  // Dùng transaction để đảm bảo tính nhất quán (vault + user cập nhật cùng lúc)
  const conn = await req.app.get('db').getConnection();
  try {
    await conn.beginTransaction();

    // 1. Cập nhật vault
    const [vaultResult] = await conn.execute(
      'UPDATE VAULT SET encrypted_data = ? WHERE user_id = ?',
      [encryptedData, userId]
    );
    if (vaultResult.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Vault không tìm thấy' });
    }

    // 2. Nếu đổi Master Password: cập nhật auth_hash + salt trong USER
    if (isChangingPassword) {
      const [userResult] = await conn.execute(
        'UPDATE USER SET auth_hash = ?, salt = ? WHERE user_id = ?',
        [newAuthHash, newSalt, userId]
      );
      if (userResult.affectedRows === 0) {
        await conn.rollback();
        return res.status(404).json({ message: 'User không tìm thấy' });
      }
    }

    await conn.commit();
    return res.status(200).json({
      message: isChangingPassword ? 'Vault và Master Password đã được cập nhật' : 'Vault đã được cập nhật'
    });
  } catch (err) {
    await conn.rollback();
    console.error('Put vault error:', err);
    return res.status(500).json({ message: 'Lỗi server khi cập nhật Vault' });
  } finally {
    conn.release();
  }
});

module.exports = router;

