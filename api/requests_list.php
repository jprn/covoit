<?php

declare(strict_types=1);

require __DIR__ . '/http.php';
apply_cors();

require_method('GET');

$rideId = isset($_GET['ride_id']) ? (int)$_GET['ride_id'] : 0;

if ($rideId <= 0) {
    send_json(['error' => 'ride_id is required'], 400);
}

try {
    $pdo = require __DIR__ . '/db.php';

    $stmt = $pdo->prepare("SELECT id, ride_id, passenger_name, passenger_phone, seats, message, requester_device_id, status, created_at, updated_at
                           FROM requests
                           WHERE ride_id = :ride_id
                           ORDER BY created_at DESC");
    $stmt->execute(['ride_id' => $rideId]);

    $items = $stmt->fetchAll();
    send_json(['requests' => $items]);
} catch (Throwable $e) {
    send_json(['error' => 'Server error'], 500);
}
