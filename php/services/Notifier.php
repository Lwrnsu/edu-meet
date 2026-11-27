<?php
/*
    Decides WHO gets told about WHAT. Controllers call one method per event.

    Event                         Who is notified
    ----------------------------  ------------------------------------------
    Resources uploaded            students in the chosen sections
    Announcement posted           students in the chosen sections
    Blog posted                   students in the chosen sections
    School announcement published students its targets reach (dashboard)
    (The person posting is never notified about their own post.)

    Other modules (e.g. Activities in the Classes module) can call
    notifyClass() to put their own notifications on the same bell.
*/
require_once __DIR__ . "/../models/Notification.php";
require_once __DIR__ . "/ClassAccess.php";

class Notifier {
    private Notification $notifications;
    private ClassAccess $access;

    public function __construct(private PDO $pdo, private int $senderId) {
        $this->notifications = new Notification($pdo);
        $this->access = new ClassAccess($pdo);
    }

    // Generic: tell the students of a class (all blocks if $blockIds = []).
    public function notifyClass(int $classId, array $blockIds, string $type, string $title, string $message, string $link): int {
        return $this->notifications->send(
            $this->access->studentIdsFor($classId, $blockIds), $type, $title, $message, $link, $this->senderId
        );
    }

    // Resources belong to the whole class, so every enrolled student is told.
    public function resourcesUploaded(int $classId, array $fileNames): int {
        $what = count($fileNames) === 1 ? $fileNames[0] : count($fileNames) . " new files";
        return $this->notifyClass($classId, [], 'resource',
            count($fileNames) === 1 ? 'New resource' : 'New resources',
            $what . ' · ' . $this->className($classId),
            "resources.php?class_id=$classId");
    }

    // Called when a post becomes visible to students.
    public function postPublished(array $post, array $blockIds): int {
        $classId = (int) $post['class_id'];
        $isBlog = $post['type'] === 'blog';
        return $this->notifyClass($classId, $blockIds, $isBlog ? 'blog' : 'announcement',
            $isBlog ? 'New blog' : 'New announcement',
            $post['title'] . ' · ' . $this->className($classId),
            "feed.php?class_id=$classId");
    }

    // School-wide (dashboard) announcement published: every student it reaches.
    public function schoolAnnouncementPublished(int $announcementId, string $title, string $audience): int {
        return $this->notifications->send(
            $this->access->announcementRecipients($announcementId), 'announcement',
            'New announcement', $title . ' · ' . $audience,
            "announcements.php?id=$announcementId", $this->senderId
        );
    }

    private function className(int $classId): string {
        return $this->access->classNames([$classId])[$classId] ?? 'your class';
    }
}
