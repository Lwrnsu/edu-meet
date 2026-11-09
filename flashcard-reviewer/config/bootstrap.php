
<?php

// Database configuration
require_once __DIR__ . '/Database.php';

// OOP classes
require_once __DIR__ . '/../classes/ClassModel.php';
require_once __DIR__ . '/../classes/Deck.php';
require_once __DIR__ . '/../classes/Flashcard.php';
require_once __DIR__ . '/../classes/StudySession.php';
require_once __DIR__ . '/../classes/QuizEngine.php';
require_once __DIR__ . '/../classes/JsonManager.php';

// Create database instance
$database = new Database();

// Establish connection
$pdo = $database->connect();
