<?php

declare(strict_types=1);

require __DIR__ . '/http.php';
apply_cors();

require_method('POST');

$body = read_json_body();

$rideId = isset($body['ride_id']) ? (int)$body['ride_id'] : 0;
$passengerName = isset($body['passenger_name']) ? trim((string)$body['passenger_name']) : '';
$passengerPhone = isset($body['passenger_phone']) ? trim((string)$body['passenger_phone']) : '';
$seats = isset($body['seats']) ? (int)$body['seats'] : 0;
$message = isset($body['message']) ? (string)$body['message'] : '';
$requesterDeviceId = isset($body['requester_device_id']) ? trim((string)$body['requester_device_id']) : null;

$errors = [];
if ($rideId <= 0) $errors[] = 'ride_id is required';
if ($passengerName === '') $errors[] = 'passenger_name is required';
if ($seats <= 0 || $seats > 8) $errors[] = 'seats must be between 1 and 8';

if ($errors) {
    send_json(['error' => 'Validation error', 'details' => $errors], 400);
}

try {
    $pdo = require __DIR__ . '/db.php';

    $rideStmt = $pdo->prepare('SELECT id, seats_total FROM rides WHERE id = :id');
    $rideStmt->execute(['id' => $rideId]);
    $ride = $rideStmt->fetch();
    if (!$ride) {
        send_json(['error' => 'Ride not found'], 404);
    }

    // Seats availability check: accepted seats + requested <= total
    $accStmt = $pdo->prepare("SELECT COALESCE(SUM(seats),0) AS booked FROM requests WHERE ride_id = :ride_id AND status = 'ACCEPTED'");
    $accStmt->execute(['ride_id' => $rideId]);
    $booked = (int)($accStmt->fetch()['booked'] ?? 0);
    $left = (int)$ride['seats_total'] - $booked;
    if ($left < $seats) {
        send_json(['error' => 'Not enough seats left'], 409);
    }

    $stmt = $pdo->prepare('INSERT INTO requests (ride_id, passenger_name, passenger_phone, seats, message, requester_device_id, status) VALUES (:ride_id, :passenger_name, :passenger_phone, :seats, :message, :requester_device_id, :status)');
    $stmt->execute([
        'ride_id' => $rideId,
        'passenger_name' => $passengerName,
        'passenger_phone' => $passengerPhone !== '' ? $passengerPhone : null,
        'seats' => $seats,
        'message' => $message !== '' ? $message : null,
        'requester_device_id' => $requesterDeviceId !== '' ? $requesterDeviceId : null,
        'status' => 'PENDING',
    ]);

    $requestId = (int)$pdo->lastInsertId();

    send_json([
        'request' => [
            'id' => $requestId,
            'ride_id' => $rideId,
            'passenger_name' => $passengerName,
            'passenger_phone' => $passengerPhone,
            'seats' => $seats,
            'message' => $message,
            'status' => 'PENDING',
        ]
    ], 201);
} catch (Throwable $e) {
    send_json(['error' => 'Server error'], 500);
}
