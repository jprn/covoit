<?php

declare(strict_types=1);

require __DIR__ . '/http.php';
apply_cors();

require_method('GET');

try {
    $pdo = require __DIR__ . '/db.php';

    $cols = $pdo->query('SHOW COLUMNS FROM events')->fetchAll(PDO::FETCH_COLUMN, 0);
    $hasCity = in_array('city', $cols, true);
    $hasDate = in_array('date', $cols, true);
    $hasTimeHint = in_array('time_hint', $cols, true);

    $selectParts = [
        'id',
        'name',
        ($hasCity ? 'city' : "'' AS city"),
        ($hasDate ? 'date' : "'' AS date"),
        ($hasTimeHint ? 'time_hint' : "'' AS time_hint"),
    ];
    $select = implode(', ', $selectParts);
    $orderBy = $hasDate ? 'date ASC, id ASC' : 'id ASC';

    $stmt = $pdo->query("SELECT {$select} FROM events ORDER BY {$orderBy}");
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
