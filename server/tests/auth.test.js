process.env.JWT_SECRET = 'test_secret_value';

const request = require('supertest');
const express = require('express');
const mysql = require('mysql2');
const authRoutes = require('../routes/auth.routes');

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
app.use('/api', authRoutes);

const jwt = require('jsonwebtoken');

const validHash = "a".repeat(64);

describe('Auth API Endpoints', () => {
  let pool;
  let validToken;

  beforeAll(() => {
    pool = app.get('db');
    validToken = jwt.sign(
      { userId: 'usrid-123' },
      process.env.JWT_SECRET,
      { expiresIn: '1h', jwtid: 'auth-test-jti-001' }
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/register', () => {
    it('should return 409 if username already exists', async () => {
      // Giả lập DB trả về có 1 bản ghi qua mConnection
      const mConnection = await pool.getConnection();
      mConnection.execute.mockResolvedValueOnce([[{ user_id: 1 }]]);

      const res = await request(app)
        .post('/api/register')
        .send({ username: 'testuser', authHash: validHash });

      expect(res.statusCode).toBe(409);
      expect(res.body.message).toMatch(/Tên đăng nhập đã tồn tại/);
    });

    it('should register successfully and return 201', async () => {
      const mConnection = await pool.getConnection();
      // Lần 1: check tồn tại -> rỗng
      // Lần 2, 3: insert User, Vault
      mConnection.execute
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([{ insertId: 1 }])
        .mockResolvedValueOnce([{ insertId: 2 }]);

      const res = await request(app)
        .post('/api/register')
        .send({ username: 'newuser', authHash: validHash });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('userId');
      expect(res.body).toHaveProperty('message', 'Đăng ký thành công');
    });
  });

  describe('POST /api/login', () => {
    it('should return 401 for wrong credentials', async () => {
      // DB trả về rỗng (không tìm thấy db)
      pool.execute.mockResolvedValueOnce([[]]);

      const res = await request(app)
        .post('/api/login')
        .send({ username: 'nouser', authHash: validHash });

      expect(res.statusCode).toBe(401);
    });

    it('should return 200 and token for correct credentials', async () => {
      // Giả lập tìm thấy User
      pool.execute.mockResolvedValueOnce([[{
        user_id: 'usrid-123',
        username: 'validuser',
        auth_hash: validHash,
        salt: 'validsalt'
      }]]);

      const res = await request(app)
        .post('/api/login')
        .send({ username: 'validuser', authHash: validHash });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('salt', 'validsalt');
    });
  });

  describe('POST /api/logout', () => {
    it('should return 401 if no token provided', async () => {
      const res = await request(app).post('/api/logout');
      expect(res.statusCode).toBe(401);
    });

    it('should blacklist the token and return 200', async () => {
      // jwtMiddleware: blacklist check → not revoked
      pool.execute.mockResolvedValueOnce([[]]);
      // logout handler: INSERT INTO TOKEN_BLACKLIST
      pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app)
        .post('/api/logout')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message', 'Đăng xuất thành công');
    });

    it('should return 401 if token is already blacklisted', async () => {
      // jwtMiddleware: blacklist check → token IS revoked
      pool.execute.mockResolvedValueOnce([[{ jti: 'auth-test-jti-001' }]]);

      const res = await request(app)
        .post('/api/logout')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toMatch(/thu hồi/);
    });
  });
});
