<?php
require_once __DIR__.'/db.php';
$pdo = db();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  $id = isset($_GET['id']) ? intval($_GET['id']) : null;
  if ($id) {
    $stmt = $pdo->prepare('select id,name,sport,date,city,location,dest_lat,dest_lng from events where id=?');
    $stmt->execute([$id]);
    $event = $stmt->fetch();
    json(['event'=>$event]);
  } else {
    $stmt = $pdo->query('select id,name,sport,date,city,location,dest_lat,dest_lng from events order by date asc');
    $events = $stmt->fetchAll();
    json(['events'=>$events]);
  }
}

json(['error'=>'Méthode non autorisée'], 405);
