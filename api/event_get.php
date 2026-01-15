<?php

declare(strict_types=1);

require __DIR__ . '/http.php';
apply_cors();

require_method('GET');

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

try {
    $pdo = require __DIR__ . '/db.php';

    if ($id > 0) {
        $stmt = $pdo->prepare('SELECT id, name, city, event_date, time_hint, address, description, created_at FROM events WHERE id = :id');
        $stmt->execute(['id' => $id]);
        $event = $stmt->fetch();
    } else {
        // Single-event mode: return the first event
        $stmt = $pdo->query('SELECT id, name, city, event_date, time_hint, address, description, created_at FROM events ORDER BY id ASC LIMIT 1');
        $event = $stmt->fetch();
    }

    if (!$event) {
        send_json(['error' => 'Event not found'], 404);
    }

    // Map DB fields to the front expected shape
    $out = [
        'id' => (int)$event['id'],
        'name' => (string)$event['name'],
        'city' => $event['city'] !== null ? (string)$event['city'] : '',
        'date' => $event['event_date'] !== null ? ((string)$event['event_date'] . 'T00:00:00.000Z') : null,
        'time_hint' => $event['time_hint'] !== null ? (string)$event['time_hint'] : '',
        'address' => $event['address'] !== null ? (string)$event['address'] : '',
        'desc' => $event['description'] !== null ? (string)$event['description'] : '',
    ];

    send_json(['event' => $out]);
} catch (Throwable $e) {
    send_json(['error' => 'Server error'], 500);
}
