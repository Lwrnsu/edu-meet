USE edumeet;
DROP TABLE IF EXISTS users;
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  role ENUM('faculty','student') NOT NULL
);
INSERT INTO users (name, role) VALUES
('Prof. Santos', 'faculty'),
('Aiden Esguerra', 'student'),
('Bianca Bautista', 'student'),
('Enrique Evangelista', 'student');

INSERT INTO tasks (title, description, due_date, max_score, created_by) VALUES
('Activity 1: ERD Design', 'Submit your entity relationship diagram as a PDF or image.', '2026-11-30 23:59:00', 50, 1),
('Module 2 Reflection', 'Write a one-page reflection on the lesson.', '2026-12-05 17:00:00', 20, 1);
