process.env.JWT_SECRET = 'test_secret_value';

const request = require('supertest');
const express = require('express');
const mysql = require('mysql2');
const vaultRoutes = require('../routes/vault.routes');
const jwtMiddleware = require('../middleware/jwt.middleware');
const jwt = require('jsonwebtoken');

// Mock mysql2
jest.mock('mysql2', () => {
  const mConnection = {
    beginTransaction: jest.fn(),
    execute: jest.fn(),
    commit: jest.fn(),
    rollback: jest.fn(),
    release: jest.fn(),
  };
  const mPromisePool = {
    execute: jest.fn(),
    getConnection: jest.fn().mockResolvedValue(mConnection),
  };
  const mPool = {
    promise: jest.fn(() => mPromisePool),
  };
  return {
    createPool: jest.fn(() => mPool),
  };
});

const app = express();
app.set('db', mysql.createPool().promise());
app.use(express.json());
app.use('/api', jwtMiddleware, vaultRoutes);

describe('Vault API Endpoints', () => {
  let pool;
  let validToken;
  
  beforeAll(() => {
    pool = app.get('db');
    // Use the default fallback secret from jwt.middleware.js
    validToken = jwt.sign(
      { userId: 'usrid-123' },
      process.env.JWT_SECRET,
      { expiresIn: '1h', jwtid: 'test-jti-123' }
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/vault', () => {
    it('should return 401 if no token provided', async () => {
      const res = await request(app).get('/api/vault');
      expect(res.statusCode).toBe(401);
    });

    it('should return 404 if vault not found', async () => {
      // Blacklist check: token not revoked
      pool.execute.mockResolvedValueOnce([[]]);
      // Vault query: not found
      pool.execute.mockResolvedValueOnce([[]]);

      const res = await request(app)
        .get('/api/vault')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toMatch(/Vault không tồn tại/);
    });

    it('should return 200 and ciphertext if successful', async () => {
      // Blacklist check: token not revoked
      pool.execute.mockResolvedValueOnce([[]]);
      pool.execute.mockResolvedValueOnce([[{ encrypted_data: 'encrypted-base64-blob', updated_at: '2023-01-01' }]]);

      const res = await request(app)
        .get('/api/vault')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('encryptedData', 'encrypted-base64-blob');
    });
  });

  describe('PUT /api/vault', () => {
    it('should update vault and return 200', async () => {
      // Blacklist check: token not revoked
      pool.execute.mockResolvedValueOnce([[]]);
      const mConnection = await pool.getConnection();
      mConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app)
        .put('/api/vault')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ encryptedData: 'dGVzdEVuY3J5cHRlZERhdGE=' }); // valid Base64

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message', 'Vault đã được cập nhật');
    });

    it('should return 400 for invalid Base64 encryptedData', async () => {
      pool.execute.mockResolvedValueOnce([[]]); // blacklist check

      const res = await request(app)
        .put('/api/vault')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ encryptedData: '!!!not-valid-base64!!!' });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/Base64/);
    });

    it('should update vault AND user credentials on change-password (newAuthHash + newSalt)', async () => {
      // Blacklist check: token not revoked
      pool.execute.mockResolvedValueOnce([[]]);
      const mConnection = await pool.getConnection();
      // 1st execute: UPDATE VAULT
      mConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
      // 2nd execute: UPDATE USER (auth_hash + salt)
      mConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const newAuthHash = 'b'.repeat(64); // valid 64-char hex
      const newSalt     = 'c'.repeat(32); // valid 32-char hex

      const res = await request(app)
        .put('/api/vault')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          encryptedData: 'dGVzdEVuY3J5cHRlZERhdGE=',
          newAuthHash,
          newSalt,
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toMatch(/Master Password/);

      // Verify both DB statements were called
      expect(mConnection.execute).toHaveBeenCalledTimes(2);
      expect(mConnection.commit).toHaveBeenCalledTimes(1);
    });

    it('should return 400 if newAuthHash is invalid when changing password', async () => {
      pool.execute.mockResolvedValueOnce([[]]); // blacklist check

      const res = await request(app)
        .put('/api/vault')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          encryptedData: 'dGVzdEVuY3J5cHRlZERhdGE=',
          newAuthHash: 'tooshort',
          newSalt: 'c'.repeat(32),
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/newAuthHash/);
    });
  });
});
