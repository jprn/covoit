<?php

declare(strict_types=1);

require __DIR__ . '/http.php';
apply_cors();

require_method('GET');

try {
    $pdo = require __DIR__ . '/db.php';

    $stmt = $pdo->query('SELECT id, name, city, date, time_hint FROM events ORDER BY date ASC, id ASC');
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $events = array_map(static function ($r) {
        return [
            'id' => (int)$r['id'],
            'name' => (string)$r['name'],
            'city' => (string)($r['city'] ?? ''),
            'date' => (string)($r['date'] ?? ''),
            'time_hint' => (string)($r['time_hint'] ?? ''),
        ];
    }, $rows);

    send_json(['events' => $events]);
} catch (Throwable $e) {
    send_json(['error' => 'Server error'], 500);
}
