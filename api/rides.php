<?php
require_once __DIR__.'/db.php';
$pdo = db();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
  $eventId = isset($_GET['event_id']) ? intval($_GET['event_id']) : null;
  $where = '';
  $params = [];
  if ($eventId) { $where = 'where r.event_id = ?'; $params[] = $eventId; }
  $sql = "select r.*, e.name as event_name, e.city as event_city,
           u.first_name, u.last_name,
           (select coalesce(sum(b.seats),0) from bookings b where b.ride_id=r.id and b.status in ('pending','accepted')) as seats_booked
          from rides r
          join events e on e.id=r.event_id
          join users u on u.id=r.user_id
          $where
          order by r.depart_at asc";
  $stmt = $pdo->prepare($sql);
  $stmt->execute($params);
  $rows = $stmt->fetchAll();
  $rides = array_map(function($x){
    $x['driver_name'] = trim(($x['first_name'] ?? '').' '.($x['last_name'] ?? ''));
    return $x;
  }, $rows);
  json(['rides'=>$rides]);
}

if ($method === 'POST') {
  $me = require_user();
  $input = json_decode(file_get_contents('php://input'), true) ?: [];
  $event_id = intval($input['event_id'] ?? 0);
  $ride_type = $input['ride_type'] ?? '';
  $depart_at = $input['depart_at'] ?? '';
  $origin_text = trim($input['origin_text'] ?? '');
  $seats_total = intval($input['seats_total'] ?? 0);
  $max_detour_km = intval($input['max_detour_km'] ?? 0);
  $price_suggested = intval($input['price_suggested'] ?? 0);
  $note = $input['note'] ?? null;
  $rules = $input['rules'] ?? [];
  if (!$event_id || !in_array($ride_type, ['go','return','roundtrip']) || !$depart_at || !$origin_text || $seats_total<1) {
    json(['error'=>'Champs invalides'], 400);
  }
  $stmt = $pdo->prepare('insert into rides (user_id,event_id,ride_type,depart_at,origin_text,seats_total,max_detour_km,price_suggested,note,rules,status,created_at) values (?,?,?,?,?,?,?,?,?,? ,"active", now())');
  $stmt->execute([$me['id'],$event_id,$ride_type,$depart_at,$origin_text,$seats_total,$max_detour_km,$price_suggested,$note,json_encode($rules)]);
  json(['ok'=>true]);
}

json(['error'=>'Méthode non autorisée'], 405);
