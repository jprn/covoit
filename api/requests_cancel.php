<?php

declare(strict_types=1);

require __DIR__ . '/http.php';
apply_cors();

require_method('POST');

$body = read_json_body();

$requestId = isset($body['request_id']) ? (int)$body['request_id'] : 0;
$requesterDeviceId = isset($body['requester_device_id']) ? trim((string)$body['requester_device_id']) : '';

if ($requestId <= 0 || $requesterDeviceId === '') {
    send_json(['error' => 'request_id and requester_device_id are required'], 400);
}

try {
    $pdo = require __DIR__ . '/db.php';

    $stmt = $pdo->prepare('SELECT id, requester_device_id, status FROM requests WHERE id = :id');
    $stmt->execute(['id' => $requestId]);
    $row = $stmt->fetch();

    if (!$row) {
        send_json(['error' => 'Request not found'], 404);
    }

    if ((string)$row['requester_device_id'] !== $requesterDeviceId) {
        send_json(['error' => 'Not allowed'], 403);
    }

    if ((string)$row['status'] !== 'PENDING') {
        send_json(['error' => 'Only PENDING requests can be cancelled'], 409);
    }

    $upd = $pdo->prepare("UPDATE requests SET status = 'CANCELLED' WHERE id = :id");
    $upd->execute(['id' => $requestId]);

    send_json(['ok' => true]);
} catch (Throwable $e) {
    send_json(['error' => 'Server error'], 500);
}
