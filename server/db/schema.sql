-- ============================================================
--  EasyPass -- Database Schema (Physical Model)
--  Phase 3: Data Implementation
-- ============================================================

CREATE DATABASE IF NOT EXISTS easypass CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE easypass;

-- ---- Bảng USER ----
CREATE TABLE IF NOT EXISTS USER (
  user_id     CHAR(36)        NOT NULL,
  username    VARCHAR(50)     NOT NULL,
  auth_hash   CHAR(64)        NOT NULL COMMENT 'SHA-256(MasterPassword) in hex, NOT the password itself',
  salt        CHAR(32)        NOT NULL COMMENT 'Hex of 16 random bytes, generated at registration',
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (user_id),
  CONSTRAINT chk_username CHECK (username REGEXP '^[A-Za-z0-9_\\-\\.]+$'),
  CONSTRAINT chk_auth_hash_len CHECK (CHAR_LENGTH(auth_hash) = 64),
  CONSTRAINT chk_salt_len CHECK (CHAR_LENGTH(salt) = 32)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Unique index on username
CREATE UNIQUE INDEX idx_username ON USER (username);

-- ---- Bảng VAULT ----
CREATE TABLE IF NOT EXISTS VAULT (
  vault_id        CHAR(36)    NOT NULL,
  user_id         CHAR(36)    NOT NULL,
  encrypted_data  LONGTEXT    NOT NULL COMMENT 'AES-256-GCM ciphertext in Base64. Server never reads/parses this.',
  updated_at      TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (vault_id),
  CONSTRAINT fk_vault_user FOREIGN KEY (user_id) REFERENCES USER (user_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Unique index: each user has exactly one vault (1:1 with USER)
CREATE UNIQUE INDEX idx_vault_user ON VAULT (user_id);
