CREATE DATABASE IF NOT EXISTS db_edu_meet
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_general_ci;

USE db_edu_meet;

-- Matches the existing XAMPP tbl_users shape (status: 1=active, 0=inactive)
CREATE TABLE IF NOT EXISTS tbl_users (
  id INT(11) NOT NULL AUTO_INCREMENT,
  email VARCHAR(64) NOT NULL,
  password VARCHAR(128) NOT NULL,
  first_name VARCHAR(128) NOT NULL,
  last_name VARCHAR(128) NOT NULL,
  status TINYINT(3) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT NULL,
  deleted_at DATETIME DEFAULT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
