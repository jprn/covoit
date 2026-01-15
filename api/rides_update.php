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

    $update = [];
    $params = [];

    if (isset($data['ride_type'])) {
        $update[] = 'ride_type = ?';
        $params[] = (string)$data['ride_type'];
    }
    if (isset($data['depart_at'])) {
        // Expect ISO string; store as DATETIME or TEXT as-is
        $update[] = 'depart_at = ?';
        $params[] = (string)$data['depart_at'];
    }
    if (isset($data['origin_text'])) {
        $update[] = 'origin_text = ?';
        $params[] = (string)$data['origin_text'];
    }
    if (isset($data['seats_total'])) {
        $seats = (int)$data['seats_total'];
        if ($seats <= 0) {
            send_json(['error' => 'seats_total must be > 0'], 400);
        }
        $update[] = 'seats_total = ?';
        $params[] = $seats;
    }

    if (empty($update)) {
        send_json(['error' => 'No fields to update'], 400);
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

    $sql = 'UPDATE rides SET ' . implode(', ', $update) . ' WHERE id = ?';
    $params[] = $rideId;
    $upd = $pdo->prepare($sql);
    $upd->execute($params);

    // Return updated ride
    $out = $pdo->prepare('SELECT * FROM rides WHERE id = ?');
    $out->execute([$rideId]);
    $ride = $out->fetch(PDO::FETCH_ASSOC);

    send_json(['ok' => true, 'ride' => $ride]);
} catch (Throwable $e) {
    send_json(['error' => 'Server error', 'detail' => $e->getMessage()], 500);
}
