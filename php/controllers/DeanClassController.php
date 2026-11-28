<?php

header('Content-Type: application/json');

require_once __DIR__ . '/ApiResponse.php';
require_once __DIR__ . '/ControllerHelper.php';
require_once __DIR__ . '../services/DeanClassService.php';

class DeanController
{
    use ApiRouteHelper;

    private DeanService $service;

    private array $routes = [
        'GET /api/get/programs'             => 'getPrograms',
        'POST /api/add/programs'            => 'addProgram',
        'PUT /api/update/programs'          => 'updateProgram',
        'DELETE /api/delete/programs'       => 'deleteProgram',
        'GET /api/get/program-chairs'       => 'getProgramChairs',
        'POST /api/assign/program-chair'    => 'assignProgramChair',
        'DELETE /api/remove/program-chair'  => 'removeProgramChair',
    ];

    public function __construct(DeanService $service)
    {
        $this->service = $service;
    }

    public function handle(): void
    {
        $this->dispatch($this->routes);
    }

    private function getPrograms(): void
    {
        $this->respond($this->service->getPrograms());
    }

    private function addProgram(): void
    {
        $this->respond($this->service->addProgram($this->getJsonInput()));
    }

    private function updateProgram(): void
    {
        $this->respond($this->service->updateProgram($this->getJsonInput()));
    }

    private function deleteProgram(): void
    {
        $input = $this->getJsonInput();
        $id    = (int) ($_GET['program_id'] ?? $input['program_id'] ?? 0);
        $this->respond($this->service->deleteProgram($id));
    }

    private function getProgramChairs(): void
    {
        $this->respond($this->service->getProgramChairs());
    }

    private function assignProgramChair(): void
    {
        $this->respond($this->service->assignProgramChair($this->getJsonInput()));
    }

    private function removeProgramChair(): void
    {
        $input = $this->getJsonInput();
        $id    = (int) ($_GET['chair_id'] ?? $input['chair_id'] ?? 0);
        $this->respond($this->service->removeProgramChair($id));
    }
}