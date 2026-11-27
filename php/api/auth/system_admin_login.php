<?php

require_once __DIR__ . '/../../helpers/Cors.php';

Cors::apply(['POST', 'OPTIONS']);

require_once __DIR__ . '/../../controllers/AuthController.php';

$controller = new AuthController();
$controller->systemAdminLogin();
