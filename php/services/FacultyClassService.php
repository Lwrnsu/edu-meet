<?php

require_once __DIR__ . '../models/ApiResponse.php';
require_once __DIR__ . '../repositories/FacultyClassRepository.php';

class FacultyClassService
{
    private const ALLOWED_STATUSES = ['Present', 'Absent', 'Late', 'Excused'];

    private FacultyClassRepository $repo;

    public function __construct(FacultyClassRepository $repo)
    {
        $this->repo = $repo;
    }

    public function getAssignedClasses(int $profId): ApiResponse
    {
        if ($profId <= 0) {
            return new ApiResponse(false, 400, 'Valid prof_id is required.', []);
        }

        return $this->repo->getAssignedClasses($profId);
    }

    public function openClass(int $classId, int $profId): ApiResponse
    {
        if ($classId <= 0 || $profId <= 0) {
            return new ApiResponse(false, 400, 'Valid class_id and prof_id are required.', []);
        }

        return $this->repo->openClass($classId, $profId);
    }

    public function getClassRoster(int $classId, int $profId, ?string $attendanceDate = null): ApiResponse
    {
        if ($classId <= 0 || $profId <= 0) {
            return new ApiResponse(false, 400, 'Valid class_id and prof_id are required.', []);
        }

        if ($attendanceDate !== null && $attendanceDate !== '' && !$this->isValidDate($attendanceDate)) {
            return new ApiResponse(false, 400, 'attendance_date must be in YYYY-MM-DD format.', []);
        }

        return $this->repo->getClassRoster($classId, $profId, $attendanceDate);
    }

    public function saveAttendance(array $input): ApiResponse
    {
        $classId        = (int) ($input['class_id'] ?? 0);
        $profId         = (int) ($input['prof_id'] ?? 0);
        $attendanceDate = trim((string) ($input['attendance_date'] ?? ''));
        $records        = $input['records'] ?? [];

        if ($classId <= 0 || $profId <= 0) {
            return new ApiResponse(false, 400, 'Valid class_id and prof_id are required.', []);
        }

        if (!$this->isValidDate($attendanceDate)) {
            return new ApiResponse(false, 400, 'Valid attendance_date (YYYY-MM-DD) is required.', []);
        }

        if (!is_array($records) || empty($records)) {
            return new ApiResponse(false, 400, 'records array is required.', []);
        }

        $normalized = [];
        foreach ($records as $rec) {
            $studentId = (int) ($rec['student_id'] ?? 0);
            $rawStatus = strtolower(trim((string) ($rec['status'] ?? '')));
            $status    = ucfirst($rawStatus);

            if ($studentId <= 0 || !in_array($status, self::ALLOWED_STATUSES, true)) {
                return new ApiResponse(
                    false,
                    400,
                    'Each record requires a valid student_id and status (Present, Absent, Late, Excused).',
                    []
                );
            }

            $normalized[] = [
                'student_id' => $studentId,
                'status'     => $status,
                'remarks'    => isset($rec['remarks']) && trim((string) $rec['remarks']) !== ''
                    ? trim((string) $rec['remarks'])
                    : null,
            ];
        }

        return $this->repo->saveAttendance($classId, $profId, $attendanceDate, $normalized);
    }

    private function isValidDate(string $date): bool
    {
        $dt = DateTime::createFromFormat('Y-m-d', $date);
        return $dt !== false && $dt->format('Y-m-d') === $date;
    }
}