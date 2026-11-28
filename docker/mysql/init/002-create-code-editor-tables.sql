CREATE TABLE IF NOT EXISTS edu_meet.questions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  question TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS edu_meet.assigned_question (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  question_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_assigned_question_question
    FOREIGN KEY (question_id) REFERENCES edu_meet.questions (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS edu_meet.submissions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_name VARCHAR(255) NOT NULL,
  question_id INT UNSIGNED NOT NULL,
  code MEDIUMTEXT NOT NULL,
  score INT NULL,
  comment TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_submissions_question_id (question_id),
  CONSTRAINT fk_submission_question
    FOREIGN KEY (question_id) REFERENCES edu_meet.questions (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
