<?php
/**
 * Single entry point (front controller) for the Files / Tasks back end.
 *
 *   index.php?r=<controller>.<action>
 *   e.g. GET  index.php?r=tasks.list
 *        POST index.php?r=tasks.save      (+ X-CSRF-Token header)
 *
 * The back end only returns JSON (or a file stream for downloads/exports).
 */
session_start();

require_once __DIR__ . '/config.php';
foreach (['Http', 'Db', 'Util', 'Auth', 'Uploader', 'Controller'] as $c) require_once __DIR__ . "/core/$c.php";
foreach (['Auth', 'Task', 'Submission', 'Resource', 'File', 'Export'] as $c) require_once __DIR__ . "/controllers/{$c}Controller.php";

set_exception_handler(function (Throwable $e) {
    error_log($e);
    Http::fail('Server error. Please try again.', 500);
});

// route => [HTTP method, controller class, method]
$routes = [
    'auth.me'                => ['GET',  'AuthController',       'me'],
    'auth.switchRole'        => ['POST', 'AuthController',       'switchRole'],

    'tasks.list'             => ['GET',  'TaskController',       'index'],
    'tasks.show'             => ['GET',  'TaskController',       'show'],
    'tasks.save'             => ['POST', 'TaskController',       'save'],
    'tasks.delete'           => ['POST', 'TaskController',       'delete'],

    'submissions.submit'     => ['POST', 'SubmissionController', 'submit'],
    'submissions.remove'     => ['POST', 'SubmissionController', 'remove'],
    'submissions.score'      => ['POST', 'SubmissionController', 'score'],

    'resources.list'         => ['GET',  'ResourceController',   'index'],
    'resources.upload'       => ['POST', 'ResourceController',   'upload'],
    'resources.update'       => ['POST', 'ResourceController',   'update'],
    'resources.delete'       => ['POST', 'ResourceController',   'delete'],

    'files.download'         => ['GET',  'FileController',       'download'],

    'exports.scores'         => ['GET',  'ExportController',     'scores'],
    'exports.submissionsZip' => ['GET',  'ExportController',     'submissionsZip'],
];

$route = $_GET['r'] ?? '';
if (!isset($routes[$route])) Http::fail('Unknown route.', 404);
[$method, $class, $action] = $routes[$route];

if ($_SERVER['REQUEST_METHOD'] !== $method) Http::fail("Use $method for this route.", 405);

// A multipart POST that exceeded post_max_size arrives empty.
if ($method === 'POST' && Request::isMultipart() && !$_POST && !$_FILES && (int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) {
    Http::fail('Upload too large. The maximum file size is 30 MB.', 413);
}

if (!Auth::user()) Http::fail('Not logged in.', 401, ['login_url' => LOGIN_URL]);
if ($method === 'POST') Auth::verifyCsrf();

(new $class())->$action();
