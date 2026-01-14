<?php
require_once __DIR__.'/db.php';
$pdo = db();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
  $me = require_user();
  $booking_id = isset($_GET['booking_id']) ? intval($_GET['booking_id']) : 0;
  if ($booking_id<=0) json(['error'=>'booking_id requis'], 400);
  // check participant
  $stmt = $pdo->prepare('select b.*, r.user_id as driver_id from bookings b join rides r on r.id=b.ride_id where b.id=?');
  $stmt->execute([$booking_id]);
  $bk = $stmt->fetch();
  if (!$bk || ($bk['passenger_id']!=$me['id'] && $bk['driver_id']!=$me['id'])) json(['error'=>'Forbidden'], 403);
  $mstmt = $pdo->prepare('select id, booking_id, sender_id, text, created_at from messages where booking_id=? order by created_at asc');
  $mstmt->execute([$booking_id]);
  $messages = $mstmt->fetchAll();
  json(['messages'=>$messages]);
}

if ($method === 'POST') {
  $me = require_user();
  $input = json_decode(file_get_contents('php://input'), true) ?: [];
  $booking_id = intval($input['booking_id'] ?? 0);
  $text = trim($input['text'] ?? '');
  if ($booking_id<=0 || $text==='') json(['error'=>'Paramètres invalides'], 400);
  $stmt = $pdo->prepare('select b.*, r.user_id as driver_id from bookings b join rides r on r.id=b.ride_id where b.id=?');
  $stmt->execute([$booking_id]);
  $bk = $stmt->fetch();
  if (!$bk || ($bk['passenger_id']!=$me['id'] && $bk['driver_id']!=$me['id'])) json(['error'=>'Forbidden'], 403);
  $pdo->prepare('insert into messages (booking_id, sender_id, text, created_at) values (?,?,?, now())')
      ->execute([$booking_id, $me['id'], $text]);
  // notify other participant
  $other_id = ($bk['passenger_id']==$me['id']) ? $bk['driver_id'] : $bk['passenger_id'];
  if ($other_id) {
    $pdo->prepare('insert into notifications (user_id, title, body, created_at) values (?,?,?, now())')
        ->execute([$other_id, 'Nouveau message', mb_substr($text,0,120)]);
  }
  json(['ok'=>true]);
}

json(['error'=>'Méthode non autorisée'], 405);
