<?php

declare(strict_types=1);

require __DIR__ . '/http.php';
apply_cors();

require_method('POST');

$body = read_json_body();
$rideId = isset($body['ride_id']) ? (int)$body['ride_id'] : 0;
$adminCode = isset($body['admin_code']) ? trim((string)$body['admin_code']) : '';

if ($rideId <= 0 || $adminCode === '') {
    send_json(['error' => 'ride_id and admin_code are required'], 400);
}

// Simple admin gate (manual operational process)
if ($adminCode !== '170373') {
    send_json(['error' => 'Admin code incorrect'], 403);
}

try {
    $pdo = require __DIR__ . '/db.php';

    $stmt = $pdo->prepare('SELECT id, driver_phone FROM rides WHERE id = ?');
    $stmt->execute([$rideId]);
    $ride = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$ride) {
        send_json(['error' => 'Ride not found'], 404);
    }

    $pin = (string)random_int(100000, 999999);
    $pinHash = password_hash($pin, PASSWORD_DEFAULT);

    $upd = $pdo->prepare('UPDATE rides SET owner_pin_hash = ? WHERE id = ?');
    $upd->execute([$pinHash, $rideId]);

    send_json([
        'ok' => true,
        'owner_pin' => $pin,
        'driver_phone' => (string)($ride['driver_phone'] ?? ''),
    ]);
} catch (Throwable $e) {
    send_json(['error' => 'Server error'], 500);
}
