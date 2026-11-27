<?php

require_once __DIR__ . '../models/ApiResponse.php';
require_once __DIR__ . '../repositories/DeanRepository.php';

class DeanService
{
    private DeanRepository $repo;

    public function __construct(DeanRepository $repo)
    {
        $this->repo = $repo;
    }

    public function getPrograms(): ApiResponse
    {
        return $this->repo->getPrograms();
    }

    public function addProgram(array $input): ApiResponse
    {
        $name = trim((string) ($input['program_name'] ?? ''));
        $code = trim((string) ($input['program_code'] ?? ''));

        if ($name === '' || $code === '') {
            return new ApiResponse(false, 400, 'program_name and program_code are required.', []);
        }

        return $this->repo->addProgram($name, $code);
    }

    public function updateProgram(array $input): ApiResponse
    {
        $id   = (int) ($input['program_id'] ?? 0);
        $name = trim((string) ($input['program_name'] ?? ''));
        $code = trim((string) ($input['program_code'] ?? ''));

        if ($id <= 0 || $name === '' || $code === '') {
            return new ApiResponse(false, 400, 'Valid program_id, program_name, and program_code are required.', []);
        }

        return $this->repo->updateProgram($id, $name, $code);
    }

    public function deleteProgram(int $programId): ApiResponse
    {
        if ($programId <= 0) {
            return new ApiResponse(false, 400, 'Valid program_id is required.', []);
        }

        return $this->repo->deleteProgram($programId);
    }

    public function getProgramChairs(): ApiResponse
    {
        return $this->repo->getProgramChairs();
    }

    public function assignProgramChair(array $input): ApiResponse
    {
        $userId    = (int) ($input['user_id'] ?? 0);
        $chairName = trim((string) ($input['chair_name'] ?? ''));
        $email     = trim((string) ($input['email'] ?? ''));
        $programId = (int) ($input['program_id'] ?? 0);
        $profId    = isset($input['prof_id']) && (int) $input['prof_id'] > 0 ? (int) $input['prof_id'] : null;

        if ($userId <= 0 || $chairName === '' || $programId <= 0) {
            return new ApiResponse(false, 400, 'user_id, chair_name, and program_id are required.', []);
        }

        return $this->repo->assignProgramChair($userId, $chairName, $email, $programId, $profId);
    }

    public function removeProgramChair(int $chairId): ApiResponse
    {
        if ($chairId <= 0) {
            return new ApiResponse(false, 400, 'Valid chair_id is required.', []);
        }

        return $this->repo->removeProgramChair($chairId);
    }
}