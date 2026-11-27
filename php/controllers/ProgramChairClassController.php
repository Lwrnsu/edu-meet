<?php

header('Content-Type: application/json');

class ProgramChairClassController
{
    // "METHOD /path" => function name
    private array $routes = [
        'GET /api/get/blocks' => 'getBlocks',
        'POST /api/add/blocks' => 'addBlocks',
        'PUT /api/update/blocks' => 'updateBlocks',
        'DELETE /api/delete/blocks' => 'deleteBlocks',
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

    private function getListOfBlocks()
    {
        // return lists of blocks. Param: departmentID, programID
    }

    private function getBlock() {
        // return the lists of students inside that block. Param: blockID
    }

    private function addBlocks()
    {
        // create a block. Param: Lists of Students to add, name of the block (2-A)
    }

    private function addStudentInBlock() {
        // adds student to the block. Param: studentInfo, blockID
    }

    private function removeStudentInBlock() {
        // removes student to the block. Param: studentID, blockID
    }

    private function deleteBlocks()
    {
        // delete the block. Param: blockID
    }
}

(new ProgramChairClassController())->handle();