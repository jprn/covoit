<?php

declare(strict_types=1);

$config = require __DIR__ . '/config.php';
$db = $config['db'] ?? [];

$host = (string)($db['host'] ?? '');
$name = (string)($db['name'] ?? '');
$user = (string)($db['user'] ?? '');
$pass = (string)($db['pass'] ?? '');
$charset = (string)($db['charset'] ?? 'utf8mb4');

if ($host === '' || $name === '' || $user === '') {
    throw new RuntimeException('Database configuration is missing.');
}

$dsn = "mysql:host={$host};dbname={$name};charset={$charset}";

$pdo = new PDO($dsn, $user, $pass, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
]);

return $pdo;
