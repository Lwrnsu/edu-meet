<?php

header('Content-Type: application/json');

require_once __DIR__ . '/ApiResponse.php';
require_once __DIR__ . '/ControllerHelper.php';
require_once __DIR__ . '/ProgramChairService.php';

class ProgramChairController
{
    use ApiRouteHelper;

    private ProgramChairService $service;

    private array $routes = [
        'GET /api/get/blocks'               => 'getBlocks',
        'POST /api/add/blocks'              => 'addBlock',
        'POST /api/add/student/block'       => 'addStudentToBlock',
        'GET /api/get/classes'              => 'getClasses',
        'POST /api/add/classes'             => 'addClass',
        'POST /api/assign/block/class'      => 'assignBlockToClass',
        'POST /api/add/student/class'       => 'addStudentToClass',
        'DELETE /api/delete/student/class'  => 'removeStudentFromClass',
        'GET /api/get/class/students'       => 'getClassStudents',
    ];

    public function __construct(ProgramChairService $service)
    {
        $this->service = $service;
    }

    public function handle(): void
    {
        $this->dispatch($this->routes);
    }

    private function getBlocks(): void
    {
        $this->respond($this->service->getBlocks());
    }

    private function addBlock(): void
    {
        $this->respond($this->service->addBlock($this->getJsonInput()));
    }

    private function addStudentToBlock(): void
    {
        $this->respond($this->service->addStudentToBlock($this->getJsonInput()));
    }

    private function getClasses(): void
    {
        $this->respond($this->service->getClasses());
    }

    private function addClass(): void
    {
        $this->respond($this->service->addClass($this->getJsonInput()));
    }

    private function assignBlockToClass(): void
    {
        $this->respond($this->service->assignBlockToClass($this->getJsonInput()));
    }

    private function addStudentToClass(): void
    {
        $this->respond($this->service->addStudentToClass($this->getJsonInput()));
    }

    private function removeStudentFromClass(): void
    {
        $input = $this->getJsonInput();
        $payload = [
            'class_id'   => $_GET['class_id'] ?? $input['class_id'] ?? 0,
            'student_id' => $_GET['student_id'] ?? $input['student_id'] ?? 0,
        ];
        $this->respond($this->service->removeStudentFromClass($payload));
    }

    private function getClassStudents(): void
    {
        $classId = (int) ($_GET['class_id'] ?? 0);
        $this->respond($this->service->getClassStudents($classId));
    }
}