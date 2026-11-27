<?php

header('Content-Type: application/json');

class ClassController
{
    // "METHOD /path" => function name
    private array $routes = [
        'GET /api/validate/student' => 'isStudentInClass',
        'GET /api/get/list/class' => 'listOfStudentInClass',
    ];

    public function handle()
    {
        $method = $_SERVER['REQUEST_METHOD'];
        $path   = rtrim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
        $key    = "$method $path";

        if (isset($this->routes[$key])) {
            $this->{$this->routes[$key]}();
            return;
        }

        // Same path but wrong HTTP method -> 405, otherwise 404
        foreach (array_keys($this->routes) as $k) {
            if (substr($k, strpos($k, ' ') + 1) === $path) {
                http_response_code(405);
                echo json_encode(['error' => 'Method not allowed']);
                return;
            }
        }

        http_response_code(404);
        echo json_encode(['error' => 'Not found']);
    }

    private function getDbConnection(): PDO
    {
        $pdo = new PDO('mysql:host=localhost;dbname=attendance_system;charset=utf8mb4', 'root', '');
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        return $pdo;
    }

    private function isStudentInClass()
    {
        $classId   = isset($_GET['class_id']) ? (int) $_GET['class_id'] : 0;
        $studentId = isset($_GET['student_id']) ? (int) $_GET['student_id'] : 0;

        if ($classId <= 0 || $studentId <= 0) {
            http_response_code(400);
            echo json_encode([
                'response' => false,
                'code'     => 400,
                'message'  => 'Valid class_id and student_id are required.',
                'body'     => ['is_enrolled' => false],
            ]);
            return;
        }

        try {
            $isEnrolled = $this->checkStudentInClass($classId, $studentId);

            http_response_code(200);
            echo json_encode([
                'response' => true,
                'code'     => 200,
                'message'  => $isEnrolled ? 'Student is enrolled in class.' : 'Student is not enrolled in class.',
                'body'     => ['is_enrolled' => $isEnrolled],
            ]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode([
                'response' => false,
                'code'     => 500,
                'message'  => 'Failed to validate student enrollment.',
                'body'     => ['is_enrolled' => false],
            ]);
        }
    }

    private function checkStudentInClass(int $classId, int $studentId): bool
    {
        $pdo = $this->getDbConnection();

        $stmt = $pdo->prepare('SELECT 1 FROM class_student WHERE class_id = :class_id AND student_id = :student_id LIMIT 1');
        $stmt->execute([
            ':class_id'   => $classId,
            ':student_id' => $studentId,
        ]);

        return (bool) $stmt->fetchColumn();
    }

    private function listOfStudentInClass()
    {
        $classId = isset($_GET['class_id']) ? (int) $_GET['class_id'] : 0;

        if ($classId <= 0) {
            http_response_code(400);
            echo json_encode([
                'response' => false,
                'code'     => 400,
                'message'  => 'Valid class_id is required.',
                'body'     => [],
            ]);
            return;
        }

        try {
            $pdo = $this->getDbConnection();

            $stmt = $pdo->prepare('
                SELECT s.student_id, s.user_id, s.student_name, s.email, s.department_id
                FROM class_student cs
                JOIN student s ON cs.student_id = s.student_id
                WHERE cs.class_id = :class_id
                ORDER BY s.student_name ASC
            ');
            $stmt->execute([':class_id' => $classId]);
            $students = $stmt->fetchAll(PDO::FETCH_ASSOC);

            http_response_code(200);
            echo json_encode([
                'response' => true,
                'code'     => 200,
                'message'  => 'Students in class retrieved successfully.',
                'body'     => $students,
            ]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode([
                'response' => false,
                'code'     => 500,
                'message'  => 'Failed to retrieve students in class.',
                'body'     => [],
            ]);
        }
    }
}

(new ClassController())->handle();
