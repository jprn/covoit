<?php

declare(strict_types=1);

require __DIR__ . '/http.php';
apply_cors();

try {
    require_method('POST');

    $adminKeyHeader = trim((string)($_SERVER['HTTP_X_ADMIN_KEY'] ?? ''));
    $expectedKey = (string)(getenv('SPORTRIDE_ADMIN_KEY') ?: '');
    if ($expectedKey === '') {
        send_json(['error' => 'Admin key not configured'], 500);
    }
    if ($adminKeyHeader === '' || !hash_equals($expectedKey, $adminKeyHeader)) {
        send_json(['error' => 'Unauthorized'], 401);
    }

    $body = read_json_body();
    $rideId = isset($body['ride_id']) ? (int)$body['ride_id'] : 0;
    if ($rideId <= 0) {
        send_json(['error' => 'ride_id is required'], 400);
    }

    $pdo = require __DIR__ . '/db.php';

    $check = $pdo->prepare('SELECT id FROM rides WHERE id = ?');
    $check->execute([$rideId]);
    if (!$check->fetch()) {
        send_json(['error' => 'Ride not found'], 404);
    }

    $newPin = (string)random_int(100000, 999999);
    $pinHash = password_hash($newPin, PASSWORD_DEFAULT);

    $upd = $pdo->prepare('UPDATE rides SET owner_pin_hash = ? WHERE id = ?');
    $upd->execute([$pinHash, $rideId]);

    send_json(['ok' => true, 'ride_id' => $rideId, 'owner_pin' => $newPin]);
} catch (Throwable $e) {
    send_json(['error' => 'Server error'], 500);
}
