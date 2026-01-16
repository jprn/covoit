<?php

declare(strict_types=1);

require __DIR__ . '/http.php';
apply_cors();

require_method('POST');

$body = read_json_body();
$rideId = isset($body['ride_id']) ? (int)$body['ride_id'] : 0;
$pin = isset($body['pin']) ? trim((string)$body['pin']) : '';

if ($rideId <= 0 || $pin === '') {
    send_json(['error' => 'ride_id and pin are required'], 400);
}

try {
    $pdo = require __DIR__ . '/db.php';

    $stmt = $pdo->prepare('SELECT owner_pin_hash FROM rides WHERE id = ?');
    $stmt->execute([$rideId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        send_json(['error' => 'Ride not found'], 404);
    }
    if (!password_verify($pin, (string)$row['owner_pin_hash'])) {
        send_json(['error' => 'Code PIN incorrect'], 403);
    }

    send_json(['ok' => true]);
} catch (Throwable $e) {
    send_json(['error' => 'Server error'], 500);
}
