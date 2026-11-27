<?php

header('Content-Type: application/json');

require_once __DIR__ . '/ApiResponse.php';
require_once __DIR__ . '/ControllerHelper.php';
require_once __DIR__ . '/FacultyClassService.php';

class FacultyClassController
{
    use ApiRouteHelper;

    private FacultyClassService $service;

    private array $routes = [
        'GET /api/faculty/classes'        => 'getAssignedClasses',
        'GET /api/faculty/class/open'     => 'openClass',
        'GET /api/faculty/class/roster'   => 'getClassRoster',
        'POST /api/faculty/attendance/save' => 'saveAttendance',
    ];

    public function __construct(FacultyClassService $service)
    {
        $this->service = $service;
    }

    public function handle(): void
    {
        $this->dispatch($this->routes);
    }

    private function getAssignedClasses(): void
    {
        $profId = (int) ($_GET['prof_id'] ?? 0);
        $this->respond($this->service->getAssignedClasses($profId));
    }

    private function openClass(): void
    {
        $classId = (int) ($_GET['class_id'] ?? 0);
        $profId  = (int) ($_GET['prof_id'] ?? 0);
        $this->respond($this->service->openClass($classId, $profId));
    }

    private function getClassRoster(): void
    {
        $classId        = (int) ($_GET['class_id'] ?? 0);
        $profId         = (int) ($_GET['prof_id'] ?? 0);
        $attendanceDate = isset($_GET['attendance_date']) ? trim((string) $_GET['attendance_date']) : null;
        $this->respond($this->service->getClassRoster($classId, $profId, $attendanceDate));
    }

    private function saveAttendance(): void
    {
        $this->respond($this->service->saveAttendance($this->getJsonInput()));
    }
}