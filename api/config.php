<?php

declare(strict_types=1);

return [
    'db' => [
        'host' => getenv('SPORTRIDE_DB_HOST') ?: 'localhost',
        'name' => getenv('SPORTRIDE_DB_NAME') ?: 'u816747878_covoit',
        'user' => getenv('SPORTRIDE_DB_USER') ?: 'u816747878_jerome1',
        'pass' => getenv('SPORTRIDE_DB_PASS') ?: 'Covoit2026',
        'charset' => 'utf8mb4',
    ],
    'cors' => [
        'allow_origin' => getenv('SPORTRIDE_CORS_ALLOW_ORIGIN') ?: '*',
    ],
];
