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
      'super_secret_jwt_key_change_in_production',
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
        .send({ encryptedData: 'new-encrypted-base64-blob' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message', 'Vault đã được cập nhật');
    });
  });
});
