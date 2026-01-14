<?php
require_once __DIR__.'/db.php';
$pdo = db();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
  $me = require_user();
  $input = json_decode(file_get_contents('php://input'), true) ?: [];
  $ride_id = intval($input['ride_id'] ?? 0);
  $seats = intval($input['seats'] ?? 1);
  $message = trim($input['message'] ?? '');
  if ($ride_id<=0 || $seats<1) json(['error'=>'Paramètres invalides'], 400);

  // check not already booked (not cancelled)
  $stmt = $pdo->prepare('select id from bookings where ride_id=? and passenger_id=? and status <> "cancelled"');
  $stmt->execute([$ride_id, $me['id']]);
  if ($stmt->fetch()) json(['error'=>'Vous avez déjà une réservation pour ce trajet'], 400);

  // insert booking
  $pdo->prepare('insert into bookings (ride_id, passenger_id, seats, message, status, created_at) values (?,?,?,?,"pending", now())')
      ->execute([$ride_id, $me['id'], $seats, $message]);

  // notify driver
  $driverStmt = $pdo->prepare('select user_id from rides where id=?');
  $driverStmt->execute([$ride_id]);
  $driver = $driverStmt->fetch();
  if ($driver && $driver['user_id'] != $me['id']) {
    $pdo->prepare('insert into notifications (user_id, title, body, created_at) values (?, ?, ?, now())')
        ->execute([$driver['user_id'], 'Nouvelle demande', 'Un passager souhaite rejoindre votre trajet']);
  }
  json(['ok'=>true]);
}

json(['error'=>'Méthode non autorisée'], 405);
