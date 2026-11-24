<?php

require_once __DIR__ . '/BaseModel.php';
require_once __DIR__ . '/PublishableInterface.php';
require_once __DIR__ . '/AnnouncementScopePolicy.php';

class Announcement extends BaseModel implements PublishableInterface {
    private ?int $announcementId;
    private int $userId;
    private ?string $authorName;
    private string $role;
    private string $title;
    private string $body;
    private bool $isPinned;
    private string $status;
    private ?string $attachmentName;
    private ?string $attachmentUrl;
    /** @var array<int, array<string, int|string|null>> */
    private array $targets;
    private string $targetLabel;
    /** @var array<int, string> */
    private array $targetKeys;
    private ?string $publishedAt;
    private ?string $createdAt;
    private ?string $updatedAt;

    private const ALLOWED_STATUSES = ['draft', 'published', 'archived'];

    public function __construct(
        int $userId,
        string $role,
        string $title,
        string $body,
        array $targets = [],
        bool $isPinned = false,
        string $status = 'published',
        ?array $actorPermissions = null,
        ?int $announcementId = null,
        ?string $publishedAt = null,
        ?string $createdAt = null,
        ?string $updatedAt = null,
        ?string $attachmentName = null,
        ?string $attachmentUrl = null,
        ?string $authorName = null
    ) {
        $this->announcementId = $announcementId;
        $this->setUserId($userId);
        $this->authorName = $authorName !== null && trim($authorName) !== '' ? trim($authorName) : null;
        $this->role = AnnouncementScopePolicy::validateRole($role);
        $this->setTitle($title);
        $this->setBody($body);
        $this->setIsPinned($isPinned);
        $this->setStatus($status);
        $this->setAttachmentName($attachmentName);
        $this->setAttachmentUrl($attachmentUrl);
        $this->setTargets($targets, $actorPermissions);
        $this->publishedAt = $publishedAt;
        $this->createdAt = $createdAt;
        $this->updatedAt = $updatedAt;
    }

    public function getAnnouncementId(): ?int {
        return $this->announcementId;
    }

    public function getUserId(): int {
        return $this->userId;
    }

    public function setUserId(int $userId): void {
        if ($userId <= 0) {
            throw new InvalidArgumentException("user_id must be a positive integer.");
        }
        $this->userId = $userId;
    }

    public function getAuthorName(): ?string {
        return $this->authorName;
    }

    public function getRole(): string {
        return $this->role;
    }

    public function getTitle(): string {
        return $this->title;
    }

    public function setTitle(string $title): void {
        $trimmed = trim($title);
        if ($trimmed === '') {
            throw new InvalidArgumentException("Announcement title is required.");
        }
        if (mb_strlen($trimmed) > 180) {
            throw new InvalidArgumentException("Announcement title cannot exceed 180 characters.");
        }
        $this->title = $trimmed;
    }

    public function getBody(): string {
        return $this->body;
    }

    public function setBody(string $body): void {
        $trimmed = trim($body);
        if ($trimmed === '') {
            throw new InvalidArgumentException("Announcement body is required.");
        }
        $this->body = $trimmed;
    }

    public function isPinned(): bool {
        return $this->isPinned;
    }

    public function setIsPinned(bool $isPinned): void {
        $this->isPinned = $isPinned;
    }

    public function getStatus(): string {
        return $this->status;
    }

    public function setStatus(string $status): void {
        if (!in_array($status, self::ALLOWED_STATUSES, true)) {
            throw new InvalidArgumentException(
                "Invalid status '{$status}'. Allowed values: draft, published, archived."
            );
        }
        $this->status = $status;
    }

    public function getAttachmentName(): ?string {
        return $this->attachmentName;
    }

    public function setAttachmentName(?string $attachmentName): void {
        if ($attachmentName === null) {
            $this->attachmentName = null;
            return;
        }
        $trimmed = trim($attachmentName);
        $this->attachmentName = $trimmed !== '' ? $trimmed : null;
    }

    public function getAttachmentUrl(): ?string {
        return $this->attachmentUrl;
    }

    public function setAttachmentUrl(?string $attachmentUrl): void {
        if ($attachmentUrl === null) {
            $this->attachmentUrl = null;
            return;
        }
        $trimmed = trim($attachmentUrl);
        $this->attachmentUrl = $trimmed !== '' ? $trimmed : null;
    }

    /** @return array<int, array<string, int|string|null>> */
    public function getTargets(): array {
        return $this->targets;
    }

    public function setTargets(array $targets, ?array $actorPermissions = null): void {
        $this->targets = AnnouncementScopePolicy::normalizeAndAuthorizeTargets(
            $this->role,
            $targets,
            $actorPermissions
        );
        $this->rebuildTargetMetadata();
    }

    private function rebuildTargetMetadata(): void {
        $yearNames = [
            1 => 'Year 1',
            2 => 'Year 2',
            3 => 'Year 3',
            4 => 'Year 4 (Graduating)',
        ];

        $deptIds = [];
        $progIds = [];
        $secIds  = [];

        foreach ($this->targets as $t) {
            if (!empty($t['department_id'])) {
                $deptIds[] = (int) $t['department_id'];
            }
            if (!empty($t['program_id'])) {
                $progIds[] = (int) $t['program_id'];
            }
            if (!empty($t['section_id'])) {
                $secIds[] = (int) $t['section_id'];
            }
        }

        $deptMap = [];
        $progMap = [];
        $secMap  = [];

        try {
            $pdo = Database::connect();

            if ($deptIds !== []) {
                $in = implode(',', array_unique($deptIds));
                foreach ($pdo->query("SELECT department_id, department_code FROM departments WHERE department_id IN ($in)") as $r) {
                    $deptMap[(int) $r['department_id']] = (string) $r['department_code'];
                }
            }
            if ($progIds !== []) {
                $in = implode(',', array_unique($progIds));
                foreach ($pdo->query("SELECT program_id, program_code FROM programs WHERE program_id IN ($in)") as $r) {
                    $progMap[(int) $r['program_id']] = (string) $r['program_code'];
                }
            }
            if ($secIds !== []) {
                $in = implode(',', array_unique($secIds));
                foreach ($pdo->query("SELECT section_id, section_name FROM sections WHERE section_id IN ($in)") as $r) {
                    $secMap[(int) $r['section_id']] = (string) $r['section_name'];
                }
            }
        } catch (Throwable $e) {
        }

        $labels = [];
        $keys   = [];

        foreach ($this->targets as $t) {
            $type = (string) $t['scope_type'];
            $yr   = $t['year_level'] !== null ? (int) $t['year_level'] : null;
            $yrText = $yr !== null ? ($yearNames[$yr] ?? "Year $yr") : null;

            if ($type === 'school') {
                $keys[]   = 'ALL_STUDENTS';
                $labels[] = 'All Students';
            } elseif ($type === 'year_level' && $yr !== null) {
                $keys[]   = "YR:$yr";
                $labels[] = $yrText;
            } elseif ($type === 'department' && !empty($t['department_id'])) {
                $did   = (int) $t['department_id'];
                $dName = $deptMap[$did] ?? "Department #$did";
                if ($yr !== null) {
                    $keys[]   = "DEPT_YR:$did:$yr";
                    $labels[] = "$dName — $yrText";
                } else {
                    $keys[]   = "DEPT:$did";
                    $labels[] = $dName;
                }
            } elseif ($type === 'program' && !empty($t['program_id'])) {
                $pid   = (int) $t['program_id'];
                $pName = $progMap[$pid] ?? "Program #$pid";
                $keys[]   = "PROG:$pid";
                $labels[] = $pName;
            } elseif ($type === 'program_year' && !empty($t['program_id']) && $yr !== null) {
                $pid   = (int) $t['program_id'];
                $pName = $progMap[$pid] ?? "Program #$pid";
                $keys[]   = "PROG_YR:$pid:$yr";
                $labels[] = "$pName — $yrText";
            } elseif ($type === 'section' && !empty($t['section_id'])) {
                $sid   = (int) $t['section_id'];
                $sName = $secMap[$sid] ?? "Section #$sid";
                $keys[]   = "SEC:$sid";
                $labels[] = $sName;
            }
        }

        $this->targetKeys  = array_values(array_unique($keys));
        $this->targetLabel = $labels !== []
            ? implode(', ', array_unique($labels))
            : 'All Students';
    }

    public function resolveRecipientUserIds(): array {
        if ($this->targets === []) {
            return [];
        }

        $conditions = [];
        $params = [':author_id' => $this->userId];

        foreach ($this->targets as $idx => $t) {
            $type = (string) $t['scope_type'];

            if ($type === 'school') {
                $conditions[] = '1=1';
            } elseif ($type === 'year_level' && $t['year_level'] !== null) {
                $k = ":yr_$idx";
                $conditions[] = "COALESCE(u.year_level, s.year_level) = $k";
                $params[$k] = (int) $t['year_level'];
            } elseif ($type === 'department' && $t['department_id'] !== null) {
                $kd = ":dept_$idx";
                $params[$kd] = (int) $t['department_id'];
                if ($t['year_level'] !== null) {
                    $ky = ":dyr_$idx";
                    $conditions[] = "(COALESCE(u.department_id, s.department_id) = $kd AND COALESCE(u.year_level, s.year_level) = $ky)";
                    $params[$ky] = (int) $t['year_level'];
                } else {
                    $conditions[] = "COALESCE(u.department_id, s.department_id) = $kd";
                }
            } elseif ($type === 'program' && $t['program_id'] !== null) {
                $kp = ":prog_$idx";
                $conditions[] = "COALESCE(u.program_id, s.program_id) = $kp";
                $params[$kp] = (int) $t['program_id'];
            } elseif ($type === 'program_year' && $t['program_id'] !== null && $t['year_level'] !== null) {
                $kp = ":pprog_$idx";
                $ky = ":pyr_$idx";
                $conditions[] = "(COALESCE(u.program_id, s.program_id) = $kp AND COALESCE(u.year_level, s.year_level) = $ky)";
                $params[$kp] = (int) $t['program_id'];
                $params[$ky] = (int) $t['year_level'];
            } elseif ($type === 'section' && $t['section_id'] !== null) {
                $ks = ":sec_$idx";
                $conditions[] = "u.section_id = $ks";
                $params[$ks] = (int) $t['section_id'];
            }
        }

        if ($conditions === []) {
            return [];
        }

        $pdo = Database::connect();
        $sql = "
            SELECT DISTINCT u.user_id
            FROM users u
            LEFT JOIN sections s ON s.section_id = u.section_id
            WHERE u.role = 'student'
              AND u.user_id <> :author_id
              AND (" . implode(' OR ', $conditions) . ")
        ";

        $stmt = $pdo->prepare($sql);
        foreach ($params as $key => $val) {
            $stmt->bindValue($key, $val, PDO::PARAM_INT);
        }
        $stmt->execute();

        return array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
    }

    public function publish(): self {
        $this->setStatus('published');
        return $this->save();
    }

    public function archive(): self {
        $this->setStatus('archived');
        return $this->save();
    }

    public function toArray(): array {
        return [
            'announcement_id' => $this->announcementId,
            'user_id'         => $this->userId,
            'author_name'     => $this->authorName,
            'role'            => $this->role,
            'title'           => $this->title,
            'body'            => $this->body,
            'is_pinned'       => $this->isPinned,
            'status'          => $this->status,
            'attachment_name' => $this->attachmentName,
            'attachment_url'  => $this->attachmentUrl,
            'targets'         => $this->targets,
            'target_keys'     => $this->targetKeys,
            'target_label'    => $this->targetLabel,
            'published_at'    => $this->publishedAt,
            'created_at'      => $this->createdAt,
            'updated_at'      => $this->updatedAt,
        ];
    }

    private static function hydrate(array $row, array $targets = []): self {
        return new self(
            userId: (int) $row['user_id'],
            role: (string) $row['role'],
            title: (string) $row['title'],
            body: (string) $row['body'],
            targets: $targets,
            isPinned: filter_var($row['is_pinned'], FILTER_VALIDATE_BOOLEAN),
            status: (string) $row['status'],
            actorPermissions: null,
            announcementId: isset($row['announcement_id']) ? (int) $row['announcement_id'] : null,
            publishedAt: $row['published_at'] ?? null,
            createdAt: $row['created_at'] ?? null,
            updatedAt: $row['updated_at'] ?? null,
            attachmentName: $row['attachment_name'] ?? null,
            attachmentUrl: $row['attachment_url'] ?? null,
            authorName: $row['author_name'] ?? null
        );
    }

    private static function fetchTargetsForAnnouncement(PDO $pdo, int $announcementId): array {
        $stmt = $pdo->prepare(
            "SELECT scope_type, department_id, program_id, year_level, section_id
             FROM announcement_targets
             WHERE announcement_id = :announcement_id
             ORDER BY target_id ASC"
        );
        $stmt->bindValue(':announcement_id', $announcementId, PDO::PARAM_INT);
        $stmt->execute();

        $targets = [];
        while ($row = $stmt->fetch()) {
            $targets[] = [
                'scope_type'    => (string) $row['scope_type'],
                'department_id' => $row['department_id'] !== null ? (int) $row['department_id'] : null,
                'program_id'    => $row['program_id'] !== null ? (int) $row['program_id'] : null,
                'year_level'    => $row['year_level'] !== null ? (int) $row['year_level'] : null,
                'section_id'    => $row['section_id'] !== null ? (int) $row['section_id'] : null,
            ];
        }
        return $targets;
    }

    private function replaceTargets(PDO $pdo, int $announcementId): void {
        $delStmt = $pdo->prepare("DELETE FROM announcement_targets WHERE announcement_id = :announcement_id");
        $delStmt->bindValue(':announcement_id', $announcementId, PDO::PARAM_INT);
        $delStmt->execute();

        $insSql = "INSERT INTO announcement_targets (
                       announcement_id, scope_type, department_id, program_id, year_level, section_id
                   ) VALUES (
                       :announcement_id, :scope_type, :department_id, :program_id, :year_level, :section_id
                   )";
        $insStmt = $pdo->prepare($insSql);

        foreach ($this->targets as $target) {
            $insStmt->bindValue(':announcement_id', $announcementId, PDO::PARAM_INT);
            $insStmt->bindValue(':scope_type', (string) $target['scope_type'], PDO::PARAM_STR);
            $insStmt->bindValue(
                ':department_id',
                $target['department_id'],
                $target['department_id'] === null ? PDO::PARAM_NULL : PDO::PARAM_INT
            );
            $insStmt->bindValue(
                ':program_id',
                $target['program_id'],
                $target['program_id'] === null ? PDO::PARAM_NULL : PDO::PARAM_INT
            );
            $insStmt->bindValue(
                ':year_level',
                $target['year_level'],
                $target['year_level'] === null ? PDO::PARAM_NULL : PDO::PARAM_INT
            );
            $insStmt->bindValue(
                ':section_id',
                $target['section_id'],
                $target['section_id'] === null ? PDO::PARAM_NULL : PDO::PARAM_INT
            );
            $insStmt->execute();
        }
    }

    private function refreshAuthorName(PDO $pdo): void {
        $stmt = $pdo->prepare("SELECT full_name FROM users WHERE user_id = :uid LIMIT 1");
        $stmt->bindValue(':uid', $this->userId, PDO::PARAM_INT);
        $stmt->execute();
        $name = $stmt->fetchColumn();
        $this->authorName = is_string($name) && trim($name) !== '' ? trim($name) : null;
    }

    public function save(): self {
        $pdo = $this->db();

        $pdo->beginTransaction();
        try {
            if ($this->announcementId === null) {
                $sql = "INSERT INTO announcements (
                            user_id, role, title, body, is_pinned, status, attachment_name, attachment_url
                        ) VALUES (
                            :user_id, :role, :title, :body, :is_pinned, :status, :attachment_name, :attachment_url
                        ) RETURNING *";

                $stmt = $pdo->prepare($sql);
                $stmt->bindValue(':user_id', $this->userId, PDO::PARAM_INT);
                $stmt->bindValue(':role', $this->role, PDO::PARAM_STR);
                $stmt->bindValue(':title', $this->title, PDO::PARAM_STR);
                $stmt->bindValue(':body', $this->body, PDO::PARAM_STR);
                $stmt->bindValue(':is_pinned', $this->isPinned, PDO::PARAM_BOOL);
                $stmt->bindValue(':status', $this->status, PDO::PARAM_STR);
                $stmt->bindValue(
                    ':attachment_name',
                    $this->attachmentName,
                    $this->attachmentName === null ? PDO::PARAM_NULL : PDO::PARAM_STR
                );
                $stmt->bindValue(
                    ':attachment_url',
                    $this->attachmentUrl,
                    $this->attachmentUrl === null ? PDO::PARAM_NULL : PDO::PARAM_STR
                );
                $stmt->execute();

                $row = $stmt->fetch();
                if (!$row) {
                    throw new RuntimeException("Failed to insert announcement.");
                }

                $announcementId = (int) $row['announcement_id'];
                $this->replaceTargets($pdo, $announcementId);
                $targets = self::fetchTargetsForAnnouncement($pdo, $announcementId);

                $hydrated = self::hydrate($row, $targets);
                $this->announcementId = $hydrated->announcementId;
                $this->attachmentName = $hydrated->attachmentName;
                $this->attachmentUrl = $hydrated->attachmentUrl;
                $this->targets = $hydrated->targets;
                $this->targetKeys = $hydrated->targetKeys;
                $this->targetLabel = $hydrated->targetLabel;
                $this->publishedAt = $hydrated->publishedAt;
                $this->createdAt = $hydrated->createdAt;
                $this->updatedAt = $hydrated->updatedAt;
                $this->refreshAuthorName($pdo);
            } else {
                $sql = "UPDATE announcements
                        SET user_id = :user_id,
                            role = :role,
                            title = :title,
                            body = :body,
                            is_pinned = :is_pinned,
                            status = :status,
                            attachment_name = :attachment_name,
                            attachment_url = :attachment_url,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE announcement_id = :id
                        RETURNING *";

                $stmt = $pdo->prepare($sql);
                $stmt->bindValue(':user_id', $this->userId, PDO::PARAM_INT);
                $stmt->bindValue(':role', $this->role, PDO::PARAM_STR);
                $stmt->bindValue(':title', $this->title, PDO::PARAM_STR);
                $stmt->bindValue(':body', $this->body, PDO::PARAM_STR);
                $stmt->bindValue(':is_pinned', $this->isPinned, PDO::PARAM_BOOL);
                $stmt->bindValue(':status', $this->status, PDO::PARAM_STR);
                $stmt->bindValue(
                    ':attachment_name',
                    $this->attachmentName,
                    $this->attachmentName === null ? PDO::PARAM_NULL : PDO::PARAM_STR
                );
                $stmt->bindValue(
                    ':attachment_url',
                    $this->attachmentUrl,
                    $this->attachmentUrl === null ? PDO::PARAM_NULL : PDO::PARAM_STR
                );
                $stmt->bindValue(':id', $this->announcementId, PDO::PARAM_INT);
                $stmt->execute();

                $row = $stmt->fetch();
                if (!$row) {
                    throw new RuntimeException("Announcement not found for update.");
                }

                $this->replaceTargets($pdo, $this->announcementId);
                $targets = self::fetchTargetsForAnnouncement($pdo, $this->announcementId);

                $hydrated = self::hydrate($row, $targets);
                $this->attachmentName = $hydrated->attachmentName;
                $this->attachmentUrl = $hydrated->attachmentUrl;
                $this->targets = $hydrated->targets;
                $this->targetKeys = $hydrated->targetKeys;
                $this->targetLabel = $hydrated->targetLabel;
                $this->publishedAt = $hydrated->publishedAt;
                $this->createdAt = $hydrated->createdAt;
                $this->updatedAt = $hydrated->updatedAt;
                $this->refreshAuthorName($pdo);
            }

            $pdo->commit();
            return $this;
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }

    public static function findById(int $id): ?self {
        if ($id <= 0) {
            return null;
        }
        $pdo = Database::connect();
        $stmt = $pdo->prepare(
            "SELECT a.*, u.full_name AS author_name
             FROM announcements a
             LEFT JOIN users u ON u.user_id = a.user_id
             WHERE a.announcement_id = :id
             LIMIT 1"
        );
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();

        $row = $stmt->fetch();
        if (!$row) {
            return null;
        }

        $targets = self::fetchTargetsForAnnouncement($pdo, (int) $row['announcement_id']);
        return self::hydrate($row, $targets);
    }

    /**
     * @return Announcement[]
     */
    public static function findAll(
        ?string $status = 'published',
        ?string $scopeType = null,
        ?int $sectionId = null,
        ?int $programId = null,
        ?int $departmentId = null,
        ?int $viewerUserId = null,
        ?string $viewerRole = null
    ): array {
        $pdo = Database::connect();
        $joins = ["LEFT JOIN users u ON u.user_id = a.user_id"];
        $conditions = [];
        $params = [];

        if ($status !== null && $status !== '') {
            if (!in_array($status, self::ALLOWED_STATUSES, true)) {
                throw new InvalidArgumentException("Invalid status filter.");
            }
            $conditions[] = "a.status = :status";
            $params[':status'] = $status;
        }

        if ($scopeType !== null || $sectionId !== null || $programId !== null || $departmentId !== null) {
            $joins[] = "INNER JOIN announcement_targets t ON a.announcement_id = t.announcement_id";
        }

        if ($scopeType !== null && $scopeType !== '') {
            $conditions[] = "t.scope_type = :scope_type";
            $params[':scope_type'] = $scopeType;
        }
        if ($sectionId !== null && $sectionId > 0) {
            $conditions[] = "t.section_id = :section_id";
            $params[':section_id'] = $sectionId;
        }
        if ($programId !== null && $programId > 0) {
            $conditions[] = "t.program_id = :program_id";
            $params[':program_id'] = $programId;
        }
        if ($departmentId !== null && $departmentId > 0) {
            $conditions[] = "t.department_id = :department_id";
            $params[':department_id'] = $departmentId;
        }

        $sql = "SELECT DISTINCT a.*, u.full_name AS author_name FROM announcements a " . implode(" ", $joins);
        if ($conditions !== []) {
            $sql .= " WHERE " . implode(" AND ", $conditions);
        }
        $sql .= " ORDER BY a.is_pinned DESC, a.published_at DESC, a.announcement_id DESC";

        $stmt = $pdo->prepare($sql);
        foreach ($params as $key => $val) {
            $stmt->bindValue($key, $val, is_int($val) ? PDO::PARAM_INT : PDO::PARAM_STR);
        }
        $stmt->execute();

        // If viewer is a student, filter to announcements matching their profile
        $studentProfile = null;
        if ($viewerRole === 'student' && $viewerUserId !== null && $viewerUserId > 0) {
            $uStmt = $pdo->prepare(
                "SELECT u.section_id,
                        COALESCE(u.year_level, s.year_level) AS year_level,
                        COALESCE(u.program_id, s.program_id) AS program_id,
                        COALESCE(u.department_id, s.department_id) AS department_id
                 FROM users u
                 LEFT JOIN sections s ON s.section_id = u.section_id
                 WHERE u.user_id = :uid
                 LIMIT 1"
            );
            $uStmt->bindValue(':uid', $viewerUserId, PDO::PARAM_INT);
            $uStmt->execute();
            $uRow = $uStmt->fetch();
            if ($uRow) {
                $studentProfile = [
                    'section_id'    => $uRow['section_id'] !== null ? (int) $uRow['section_id'] : null,
                    'year_level'    => $uRow['year_level'] !== null ? (int) $uRow['year_level'] : null,
                    'program_id'    => $uRow['program_id'] !== null ? (int) $uRow['program_id'] : null,
                    'department_id' => $uRow['department_id'] !== null ? (int) $uRow['department_id'] : null,
                ];
            }
        }

        $results = [];
        while ($row = $stmt->fetch()) {
            $targets = self::fetchTargetsForAnnouncement($pdo, (int) $row['announcement_id']);
            if ($studentProfile !== null && !self::matchesStudentProfile($targets, $studentProfile)) {
                continue;
            }
            $results[] = self::hydrate($row, $targets);
        }
        return $results;
    }

    private static function matchesStudentProfile(array $targets, array $student): bool {
        foreach ($targets as $t) {
            $type = (string) $t['scope_type'];
            if ($type === 'school') {
                return true;
            }
            if ($type === 'year_level' && $student['year_level'] !== null && (int) $t['year_level'] === $student['year_level']) {
                return true;
            }
            if ($type === 'department' && $student['department_id'] !== null && (int) $t['department_id'] === $student['department_id']) {
                if ($t['year_level'] === null || (int) $t['year_level'] === $student['year_level']) {
                    return true;
                }
            }
            if ($type === 'program' && $student['program_id'] !== null && (int) $t['program_id'] === $student['program_id']) {
                return true;
            }
            if ($type === 'program_year' && $student['program_id'] !== null && $student['year_level'] !== null) {
                if ((int) $t['program_id'] === $student['program_id'] && (int) $t['year_level'] === $student['year_level']) {
                    return true;
                }
            }
            if ($type === 'section' && $student['section_id'] !== null && (int) $t['section_id'] === $student['section_id']) {
                return true;
            }
        }
        return false;
    }

    public function delete(): bool {
        if ($this->announcementId === null) {
            return false;
        }
        $pdo = $this->db();
        $stmt = $pdo->prepare("DELETE FROM announcements WHERE announcement_id = :id");
        $stmt->bindValue(':id', $this->announcementId, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->rowCount() > 0;
    }
}