<?php

require_once __DIR__ . '../models/ApiResponse.php';
require_once __DIR__ . '../repositories/ProgramChairRepository.php';

class ProgramChairService
{
    private ProgramChairRepository $repo;

    public function __construct(ProgramChairRepository $repo)
    {
        $this->repo = $repo;
    }

    public function getBlocks(): ApiResponse
    {
        return $this->repo->getBlocks();
    }

    public function addBlock(array $input): ApiResponse
    {
        $name = trim((string) ($input['block_name'] ?? ''));
        $year = (int) ($input['year_level'] ?? 0);

        if ($name === '' || $year < 1 || $year > 6) {
            return new ApiResponse(false, 400, 'Valid block_name and year_level (1-6) are required.', []);
        }

        return $this->repo->addBlock($name, $year);
    }

    public function addStudentToBlock(array $input): ApiResponse
    {
        $blockId   = (int) ($input['block_id'] ?? 0);
        $studentId = (int) ($input['student_id'] ?? 0);

        if ($blockId <= 0 || $studentId <= 0) {
            return new ApiResponse(false, 400, 'Valid block_id and student_id are required.', []);
        }

        return $this->repo->addStudentToBlock($blockId, $studentId);
    }

    public function getClasses(): ApiResponse
    {
        return $this->repo->getClasses();
    }

    public function addClass(array $input): ApiResponse
    {
        $className    = trim((string) ($input['class_name'] ?? ''));
        $subjectId    = (int) ($input['subject_id'] ?? 0);
        $profId       = isset($input['prof_id']) && (int) $input['prof_id'] > 0 ? (int) $input['prof_id'] : null;
        $academicYear = trim((string) ($input['academic_year'] ?? ''));

        if ($className === '' || $subjectId <= 0 || $academicYear === '') {
            return new ApiResponse(false, 400, 'class_name, subject_id, and academic_year are required.', []);
        }

        return $this->repo->addClass([
            'class_name'    => $className,
            'subject_id'    => $subjectId,
            'prof_id'       => $profId,
            'room'          => trim((string) ($input['room'] ?? 'TBA')),
            'schedule_day'  => trim((string) ($input['schedule_day'] ?? '')),
            'schedule_time' => trim((string) ($input['schedule_time'] ?? '')),
            'academic_year' => $academicYear,
        ]);
    }

    public function assignBlockToClass(array $input): ApiResponse
    {
        $classId = (int) ($input['class_id'] ?? 0);
        $blockId = (int) ($input['block_id'] ?? 0);

        if ($classId <= 0 || $blockId <= 0) {
            return new ApiResponse(false, 400, 'Valid class_id and block_id are required.', []);
        }

        return $this->repo->assignBlockToClass($classId, $blockId);
    }

    public function addStudentToClass(array $input): ApiResponse
    {
        $classId   = (int) ($input['class_id'] ?? 0);
        $studentId = (int) ($input['student_id'] ?? 0);

        if ($classId <= 0 || $studentId <= 0) {
            return new ApiResponse(false, 400, 'Valid class_id and student_id are required.', []);
        }

        return $this->repo->addStudentToClass($classId, $studentId);
    }

    public function removeStudentFromClass(array $input): ApiResponse
    {
        $classId   = (int) ($input['class_id'] ?? 0);
        $studentId = (int) ($input['student_id'] ?? 0);

        if ($classId <= 0 || $studentId <= 0) {
            return new ApiResponse(false, 400, 'Valid class_id and student_id are required.', []);
        }

        return $this->repo->removeStudentFromClass($classId, $studentId);
    }

    public function getClassStudents(int $classId): ApiResponse
    {
        if ($classId <= 0) {
            return new ApiResponse(false, 400, 'Valid class_id is required.', []);
        }

        return $this->repo->getClassStudents($classId);
    }
}