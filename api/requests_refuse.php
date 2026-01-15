<?php

declare(strict_types=1);

require __DIR__ . '/http.php';
apply_cors();

require_method('POST');

$body = read_json_body();

$requestId = isset($body['request_id']) ? (int)$body['request_id'] : 0;
$pin = isset($body['pin']) ? trim((string)$body['pin']) : '';

if ($requestId <= 0 || $pin === '') {
    send_json(['error' => 'request_id and pin are required'], 400);
}

try {
    $pdo = require __DIR__ . '/db.php';

    $stmt = $pdo->prepare("SELECT r.id AS request_id, r.ride_id, r.status, ri.owner_pin_hash
                           FROM requests r
                           JOIN rides ri ON ri.id = r.ride_id
                           WHERE r.id = :request_id");
    $stmt->execute(['request_id' => $requestId]);
    $row = $stmt->fetch();

    if (!$row) {
        send_json(['error' => 'Request not found'], 404);
    }

    if (!password_verify($pin, (string)$row['owner_pin_hash'])) {
        send_json(['error' => 'Code PIN incorrect'], 403);
    }

    if ((string)$row['status'] !== 'PENDING') {
        send_json(['error' => 'Only PENDING requests can be refused'], 409);
    }

    $upd = $pdo->prepare("UPDATE requests SET status = 'REFUSED' WHERE id = :request_id");
    $upd->execute(['request_id' => $requestId]);

    send_json(['ok' => true]);
} catch (Throwable $e) {
    send_json(['error' => 'Server error'], 500);
}
