<?php

header('Content-Type: application/json');

require_once __DIR__ . '/ApiResponse.php';
require_once __DIR__ . '/ControllerHelper.php';
require_once __DIR__ . '/StudentClassService.php';

class StudentClassController
{
    use ApiRouteHelper;

    private StudentClassService $service;

    private array $routes = [
        'GET /api/student/classes'    => 'getEnrolledClasses',
        'GET /api/student/attendance' => 'getAttendanceRecords',
    ];

    public function __construct(StudentClassService $service)
    {
        $this->service = $service;
    }

    public function handle(): void
    {
        $this->dispatch($this->routes);
    }

    private function getEnrolledClasses(): void
    {
        $studentId = (int) ($_GET['student_id'] ?? 0);
        $this->respond($this->service->getEnrolledClasses($studentId));
    }

    private function getAttendanceRecords(): void
    {
        $studentId = (int) ($_GET['student_id'] ?? 0);
        $classId   = isset($_GET['class_id']) && $_GET['class_id'] !== ''
            ? (int) $_GET['class_id']
            : null;

        $this->respond($this->service->getAttendanceRecords($studentId, $classId));
    }
}