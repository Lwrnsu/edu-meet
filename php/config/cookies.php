<?php

$extraOrigins = array_filter(array_map('trim', explode(',', (string) getenv('EDU_MEET_ALLOWED_ORIGINS'))));

return [
    'access_name' => 'edu_meet_token',
    'refresh_name' => 'edu_meet_refresh',
    'secure' => 'auto',
    'same_site' => 'Lax',
    'allowed_origins' => array_merge(['http://localhost:5173'], $extraOrigins),
];
