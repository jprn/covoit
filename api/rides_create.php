<?php

declare(strict_types=1);

require __DIR__ . '/http.php';
apply_cors();

require_method('POST');

$body = read_json_body();

$eventId = isset($body['event_id']) ? (int)$body['event_id'] : 0;
$rideType = isset($body['ride_type']) ? (string)$body['ride_type'] : '';
$departAtRaw = isset($body['depart_at']) ? (string)$body['depart_at'] : '';
$originText = isset($body['origin_text']) ? trim((string)$body['origin_text']) : '';
$seatsTotal = isset($body['seats_total']) ? (int)$body['seats_total'] : 0;
$driverName = isset($body['driver_name']) ? trim((string)$body['driver_name']) : '';
$driverPhone = isset($body['driver_phone']) ? trim((string)$body['driver_phone']) : '';

$errors = [];
if ($eventId <= 0) $errors[] = 'event_id is required';
if (!in_array($rideType, ['go', 'return'], true)) $errors[] = 'ride_type must be go or return';
if ($originText === '') $errors[] = 'origin_text is required';
if ($seatsTotal <= 0 || $seatsTotal > 8) $errors[] = 'seats_total must be between 1 and 8';
if ($driverName === '') $errors[] = 'driver_name is required';
if ($departAtRaw === '') $errors[] = 'depart_at is required';

$ts = strtotime($departAtRaw);
if ($ts === false) $errors[] = 'depart_at is invalid';

if ($errors) {
    send_json(['error' => 'Validation error', 'details' => $errors], 400);
}

$departAt = date('Y-m-d H:i:s', $ts);

// Generate a 6-digit PIN and store only a hash
$pin = (string)random_int(100000, 999999);
//$pinHash = password_hash($pin, PASSWORD_DEFAULT);

try {
    $pdo = require __DIR__ . '/db.php';

    $stmt = $pdo->prepare('INSERT INTO rides (event_id, ride_type, depart_at, origin_text, seats_total, driver_name, driver_phone, owner_pin_hash) VALUES (:event_id, :ride_type, :depart_at, :origin_text, :seats_total, :driver_name, :driver_phone, :owner_pin_hash)');
    $stmt->execute([
        'event_id' => $eventId,
        'ride_type' => $rideType,
        'depart_at' => $departAt,
        'origin_text' => $originText,
        'seats_total' => $seatsTotal,
        'driver_name' => $driverName,
        'driver_phone' => $driverPhone !== '' ? $driverPhone : null,
        'owner_pin_hash' => $pin,
    ]);

    $rideId = (int)$pdo->lastInsertId();

    send_json([
        'ride' => [
            'id' => $rideId,
            'event_id' => $eventId,
            'ride_type' => $rideType,
            'depart_at' => $departAt,
            'origin_text' => $originText,
            'seats_total' => $seatsTotal,
            'driver_name' => $driverName,
            'driver_phone' => $driverPhone,
        ],
        'owner_pin' => $pin,
    ], 201);
} catch (Throwable $e) {
    send_json(['error' => 'Server error'], 500);
}
