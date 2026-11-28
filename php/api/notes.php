<?php

use Database;
use Notepad\Note;
use Notepad\NoteController;
use Notepad\NoteService;

// Load the Notepad backend components
require_once __DIR__ . '/../../shared/bootstrap.php';

if (!isset($pdo) || !($pdo instanceof PDO)) {
    require_once __DIR__ . '/../config/Database.php';
    $pdo = Database::connect();
}

$note = new Note($pdo);
$noteService = new NoteService($note);
$noteController = new NoteController($noteService);

// Send the request to the Controller
$noteController->handle();