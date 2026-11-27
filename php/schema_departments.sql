-- Departments (colleges) under a school.
-- slug examples: CCS, CBA, CHTM, CAHS
CREATE TABLE IF NOT EXISTS departments (
  department_id INT(11) NOT NULL AUTO_INCREMENT,
  school_id INT(11) NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(32) NOT NULL,
  status TINYINT(3) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME DEFAULT NULL,
  PRIMARY KEY (department_id),
  UNIQUE KEY uq_departments_school_slug (school_id, slug),
  KEY idx_departments_school_id (school_id),
  CONSTRAINT fk_departments_school
    FOREIGN KEY (school_id) REFERENCES schools (school_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Example inserts (adjust school_id to match your schools table):
-- INSERT INTO departments (school_id, name, slug, status) VALUES
--   (1, 'College of Computer Studies', 'CCS', 1),
--   (1, 'College of Business and Administration', 'CBA', 1),
--   (1, 'College of Hospitality and Tourism Management', 'CHTM', 1),
--   (1, 'College of Allied Health Sciences', 'CAHS', 1);
