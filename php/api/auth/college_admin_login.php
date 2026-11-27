<?php

require_once __DIR__ . '/../../helpers/Cors.php';

Cors::apply(['POST', 'OPTIONS']);

require_once __DIR__ . '/../../controllers/AuthController.php';

// Compatibility alias for the shared school portal login.
$controller = new AuthController();
$controller->schoolLogin();
