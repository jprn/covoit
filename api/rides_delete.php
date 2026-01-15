<?php

declare(strict_types=1);

require __DIR__ . '/http.php';
apply_cors();

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        send_json(['error' => 'Method Not Allowed'], 405);
    }

    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        send_json(['error' => 'Invalid JSON body'], 400);
    }

    $rideId = isset($data['ride_id']) ? (int)$data['ride_id'] : 0;
    $pin = isset($data['pin']) ? trim((string)$data['pin']) : '';
    if ($rideId <= 0 || $pin === '') {
        send_json(['error' => 'ride_id and pin are required'], 400);
    }

    $pdo = require __DIR__ . '/db.php';

    // Verify PIN matches the ride owner
    $stmt = $pdo->prepare('SELECT owner_pin FROM rides WHERE id = ?');
    $stmt->execute([$rideId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        send_json(['error' => 'Ride not found'], 404);
    }
    if (!hash_equals((string)$row['owner_pin'], $pin)) {
        send_json(['error' => 'Invalid PIN'], 401);
    }

    // Optionally cascade delete related requests
    // $pdo->prepare('DELETE FROM requests WHERE ride_id = ?')->execute([$rideId]);

    $del = $pdo->prepare('DELETE FROM rides WHERE id = ?');
    $del->execute([$rideId]);

    send_json(['ok' => true]);
} catch (Throwable $e) {
    send_json(['error' => 'Server error', 'detail' => $e->getMessage()], 500);
}
