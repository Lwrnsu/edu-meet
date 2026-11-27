<?php

require_once __DIR__ . '/../../helpers/Cors.php';

Cors::apply(['POST', 'OPTIONS']);

require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../controllers/AuthController.php';

$claims = AuthMiddleware::requireAuth();
$controller = new AuthController();
$controller->requestPasswordOtp($claims);
