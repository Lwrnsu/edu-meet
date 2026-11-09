
CREATE DATABASE IF NOT EXISTS flashcard_reviewer
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE flashcard_reviewer;

-- 1. CLASSES
CREATE TABLE classes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);

-- 2. DECKS
CREATE TABLE decks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    class_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_deck_class
    FOREIGN KEY (class_id)
    REFERENCES classes(id)
    ON DELETE CASCADE
);

-- 3. FLASHCARDS
CREATE TABLE flashcards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    deck_id INT NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    explanation TEXT NULL,
    difficulty ENUM('easy', 'medium', 'hard')
        DEFAULT 'medium',
    position INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_flashcard_deck
    FOREIGN KEY (deck_id)
    REFERENCES decks(id)
    ON DELETE CASCADE
);

-- 4. STUDY SESSIONS
CREATE TABLE study_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    deck_id INT NOT NULL,
    total_questions INT DEFAULT 0,
    correct_answers INT DEFAULT 0,
    incorrect_answers INT DEFAULT 0,
    score_percentage DECIMAL(5,2) DEFAULT 0,
    status ENUM('ongoing', 'completed', 'abandoned')
        DEFAULT 'ongoing',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,

    CONSTRAINT fk_session_deck
    FOREIGN KEY (deck_id)
    REFERENCES decks(id)
    ON DELETE CASCADE
);

-- 5. STUDY SESSION ANSWERS
CREATE TABLE study_session_answers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    flashcard_id INT NULL,
    question_snapshot TEXT NOT NULL,
    correct_answer_snapshot TEXT NOT NULL,
    user_answer TEXT NULL,
    is_correct BOOLEAN DEFAULT FALSE,
    answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_answer_session
    FOREIGN KEY (session_id)
    REFERENCES study_sessions(id)
    ON DELETE CASCADE,

    CONSTRAINT fk_answer_flashcard
    FOREIGN KEY (flashcard_id)
    REFERENCES flashcards(id)
    ON DELETE SET NULL
);
