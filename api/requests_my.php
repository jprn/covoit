<?php

declare(strict_types=1);

require __DIR__ . '/http.php';
apply_cors();

require_method('GET');

$deviceId = isset($_GET['requester_device_id']) ? trim((string)$_GET['requester_device_id']) : '';

if ($deviceId === '') {
    send_json(['error' => 'requester_device_id is required'], 400);
}

try {
    $pdo = require __DIR__ . '/db.php';

    $stmt = $pdo->prepare("SELECT id, ride_id, passenger_name, passenger_phone, seats, message, requester_device_id, status, created_at, updated_at
                           FROM requests
                           WHERE requester_device_id = :device_id
                           ORDER BY created_at DESC");
    $stmt->execute(['device_id' => $deviceId]);

    $items = $stmt->fetchAll();
    send_json(['requests' => $items]);
} catch (Throwable $e) {
    send_json(['error' => 'Server error'], 500);
}
