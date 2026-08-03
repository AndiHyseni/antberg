-- Run on existing databases after initial schema.sql (MySQL 5.7+ / 8.0)
USE antberg;

ALTER TABLE users
  ADD COLUMN password_hash VARCHAR(255) NULL COMMENT 'scrypt hash for platform login' AFTER role,
  ADD COLUMN last_login_at DATETIME NULL AFTER is_active,
  ADD KEY idx_users_role (role);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       BIGINT UNSIGNED NOT NULL,
  token_hash    CHAR(64)        NOT NULL COMMENT 'SHA-256 of session bearer token',
  expires_at    DATETIME        NOT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_admin_sessions_token (token_hash),
  KEY idx_admin_sessions_user (user_id),
  KEY idx_admin_sessions_expires (expires_at),
  CONSTRAINT fk_admin_sessions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;
