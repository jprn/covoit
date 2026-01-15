<?php

declare(strict_types=1);

require __DIR__ . '/http.php';
apply_cors();

require_method('GET');

$eventId = isset($_GET['event_id']) ? (int)$_GET['event_id'] : 0;

try {
    $pdo = require __DIR__ . '/db.php';

    if ($eventId > 0) {
        $stmt = $pdo->prepare('SELECT id, event_id, ride_type, depart_at, origin_text, seats_total, driver_name, driver_phone, created_at, updated_at FROM rides WHERE event_id = :event_id ORDER BY depart_at ASC');
        $stmt->execute(['event_id' => $eventId]);
    } else {
        $stmt = $pdo->query('SELECT id, event_id, ride_type, depart_at, origin_text, seats_total, driver_name, driver_phone, created_at, updated_at FROM rides ORDER BY depart_at ASC');
    }

    $rides = $stmt->fetchAll();
    send_json(['rides' => $rides]);
} catch (Throwable $e) {
    send_json(['error' => 'Server error'], 500);
}
