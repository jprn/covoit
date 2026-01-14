<?php
require_once __DIR__.'/db.php';
$pdo = db();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
  if (!$id) json(['error'=>'id requis'], 400);
  $sql = "select r.*, e.name as event_name, e.city as event_city,
           u.first_name, u.last_name,
           (select coalesce(sum(b.seats),0) from bookings b where b.ride_id=r.id and b.status in ('pending','accepted')) as seats_booked
          from rides r
          join events e on e.id=r.event_id
          join users u on u.id=r.user_id
          where r.id = ?";
  $stmt = $pdo->prepare($sql);
  $stmt->execute([$id]);
  $x = $stmt->fetch();
  if ($x) {
    $x['driver_name'] = trim(($x['first_name'] ?? '').' '.($x['last_name'] ?? ''));
  }
  json(['ride'=>$x]);
}

json(['error'=>'Méthode non autorisée'], 405);
