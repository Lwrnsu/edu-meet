<?php
require_once __DIR__ . '/../config/Database.php'; 
$pdo = Database::connect(); 
function jsonBody(): array {
    return json_decode(file_get_contents("php://input"), true) ?? [];
}

function respond($data) {
    header('Content-Type: application/json');
    echo json_encode($data);
}

// questions
function getQuestions(PDO $pdo) {
    return $pdo->query("SELECT * FROM questions ORDER BY id DESC")
               ->fetchAll(PDO::FETCH_ASSOC);
}

function saveQuestion(PDO $pdo, array $d) {
    $pdo->prepare("INSERT INTO questions(question, expected_output) VALUES(?, ?)")
        ->execute([$d['question'], $d['expectedOutput']]);
    return ["success" => true];
}

function editQuestion(PDO $pdo, array $d) {
    $pdo->prepare("UPDATE questions SET question = ?, expected_output = ? WHERE id = ?")
        ->execute([$d['question'], $d['expectedOutput'], $d['id']]);
    return ["success" => true];
}

function deleteQuestion(PDO $pdo, array $d) {
    $pdo->prepare("DELETE FROM questions WHERE id = ?")->execute([$d['id']]);
    return ["success" => true];
}

// assigning
function assignQuestion(PDO $pdo, array $d) {
    $pdo->beginTransaction();
    $pdo->exec("DELETE FROM assigned_question");
    $pdo->prepare("INSERT INTO assigned_question(question_id) VALUES(?)")
        ->execute([$d['questionId']]);
    $pdo->commit();
    return ["success" => true];
}

function getAssignedQuestion(PDO $pdo) {
    return $pdo->query("
        SELECT q.id, q.question, q.expected_output
        FROM questions q
        INNER JOIN assigned_question a ON q.id = a.question_id
        LIMIT 1
    ")->fetch(PDO::FETCH_ASSOC);
}

// submitting
function submitCode(PDO $pdo, array $d) {
    $pdo->prepare("INSERT INTO submissions (student_name, question_id, code) VALUES (?, ?, ?)")
        ->execute([$d['studentName'], $d['questionId'], $d['code']]);
    return ["success" => true];
}

function getSubmissions(PDO $pdo) {
    return $pdo->query("
        SELECT * FROM submissions
        ORDER BY CASE WHEN score IS NULL THEN 0 ELSE 1 END, id DESC
    ")->fetchAll(PDO::FETCH_ASSOC);
}

// grading
function gradeSubmission(PDO $pdo, array $d) {
    $pdo->prepare("UPDATE submissions SET score = ?, comment = ? WHERE id = ?")
        ->execute([$d['score'], $d['comment'], $d['id']]);
    return ["success" => true];
}

function getStudentResult(PDO $pdo, string $studentName) {
    $stmt = $pdo->prepare("SELECT * FROM submissions WHERE student_name = ? ORDER BY id DESC");
    $stmt->execute([$studentName]);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}
?>