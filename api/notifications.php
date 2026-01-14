<?php
require_once __DIR__.'/db.php';
$pdo = db();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
  $me = require_user();
  $stmt = $pdo->prepare('select id, title, body, created_at, `read` from notifications where user_id=? order by created_at desc');
  $stmt->execute([$me['id']]);
  $rows = $stmt->fetchAll();
  json(['notifications'=>$rows]);
}

json(['error'=>'Méthode non autorisée'], 405);
