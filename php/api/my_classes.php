<?php
/*
    MY CLASSES API  —  /api/my_classes.php

    GET                 the logged-in user's classes (sidebar + Classes page)
    GET ?id=1           one class's banner details (name, subject code, schedule)
                        plus what the user may do in it

    Read-only view of the Classes module's tables (classes, subjects,
    class_blocks, class_students). See services/ClassAccess.php.
*/
require_once __DIR__ . "/../config/Database.php";
require_once __DIR__ . "/../helpers/Http.php";
require_once __DIR__ . "/../helpers/CurrentUser.php";
require_once __DIR__ . "/../models/ApiResponse.php";
require_once __DIR__ . "/../services/ClassAccess.php";

try {
    $pdo = Database::connect();
    $user = CurrentUser::fromRequest($pdo);
    if ($user === null) {
        Http::json(new ApiResponse(false, 401, "Please log in first.", []));
    }
    session_write_close();
    $access = new ClassAccess($pdo);
    $me = ['id' => $user->id, 'name' => $access->userNames([$user->id])[$user->id] ?? '', 'role' => $user->role];

    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        Http::json(new ApiResponse(false, 400, "Unknown request.", []));
    }
    if (isset($_GET['id'])) {
        $classId = (int) $_GET['id'];
        if (!$access->classExists($classId)) {
            Http::json(new ApiResponse(false, 404, "Class not found.", []));
        }
        $manage = $access->canManage($user, $classId);
        if (!$manage && !$access->enrollment($user, $classId)['enrolled'] && !$user->isAdmin()) {
            Http::json(new ApiResponse(false, 403, "You don't have access to this class.", []));
        }
        Http::json(new ApiResponse(true, 200, "Class loaded.", [
            'class' => $access->classDetails($classId), 'can_manage' => $manage, 'me' => $me,
        ]));
    }
    Http::json(new ApiResponse(true, 200, "Classes loaded.", ['classes' => $access->myClasses($user), 'me' => $me]));
} catch (Throwable $e) {
    error_log("[my_classes] " . $e);
    Http::json(new ApiResponse(false, 500, "Something went wrong. Please try again.", []));
}
