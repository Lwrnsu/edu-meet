-- Fresh install
CREATE TABLE IF NOT EXISTS roles (
  role_id INT(11) NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255) DEFAULT NULL,
  status TINYINT(3) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME DEFAULT NULL,
  PRIMARY KEY (role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Migrate existing edu_meet_db.roles (role_name ENUM → name VARCHAR + audit columns).
-- Safe to skip on a fresh install that already matches the shape above.
-- ALTER TABLE roles
--   CHANGE COLUMN role_name name VARCHAR(100) NOT NULL,
--   ADD COLUMN status TINYINT(3) NOT NULL DEFAULT 1 AFTER description,
--   ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER status,
--   ADD COLUMN updated_at DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP AFTER created_at,
--   ADD COLUMN deleted_at DATETIME DEFAULT NULL AFTER updated_at;
