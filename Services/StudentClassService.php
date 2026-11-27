<?php

require_once __DIR__ . '/ApiResponse.php';
require_once __DIR__ . '/StudentClassRepository.php';

class StudentClassService
{
    private StudentClassRepository $repo;

    public function __construct(StudentClassRepository $repo)
    {
        $this->repo = $repo;
    }

    public function getEnrolledClasses(int $studentId): ApiResponse
    {
        if ($studentId <= 0) {
            return new ApiResponse(false, 400, 'Valid student_id is required.', []);
        }

        return $this->repo->getEnrolledClasses($studentId);
    }

    public function getAttendanceRecords(int $studentId, ?int $classId = null): ApiResponse
    {
        if ($studentId <= 0) {
            return new ApiResponse(false, 400, 'Valid student_id is required.', []);
        }

        if ($classId !== null && $classId <= 0) {
            return new ApiResponse(false, 400, 'Valid class_id is required.', []);
        }

        return $this->repo->getAttendanceRecords($studentId, $classId);
    }
}