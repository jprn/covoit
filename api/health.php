<?php

declare(strict_types=1);

require __DIR__ . '/http.php';
apply_cors();

try {
    $pdo = require __DIR__ . '/db.php';
    $pdo->query('SELECT 1');
    send_json(['ok' => true]);
} catch (Throwable $e) {
    send_json(['ok' => false, 'error' => 'DB connection failed'], 500);
}
