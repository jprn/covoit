<?php
require_once __DIR__.'/db.php';
$method = $_SERVER['REQUEST_METHOD'];
$pdo = db();

if ($method === 'POST') {
  $input = json_decode(file_get_contents('php://input'), true) ?: [];
  $action = $input['action'] ?? '';

  if ($action === 'login') {
    $email = strtolower(trim($input['email'] ?? ''));
    $password = $input['password'] ?? '';
    if (!$email || !$password) json(['error'=>'Email et mot de passe requis'], 400);
    $stmt = $pdo->prepare('select * from users where email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    if (!$user) json(['error'=>'Identifiants invalides'], 401);
    // If password_hash is NULL, allow any password (MVP simulation). Otherwise verify.
    if (!is_null($user['password_hash'])) {
      if (!password_verify($password, $user['password_hash'])) json(['error'=>'Identifiants invalides'], 401);
    }
    // create session token
    $token = bin2hex(random_bytes(24));
    $exp = (new DateTime('+30 days'))->format('Y-m-d H:i:s');
    $pdo->prepare('insert into sessions (user_id, token, created_at, expires_at) values (?,?,now(),?)')->execute([$user['id'],$token,$exp]);
    unset($user['password_hash']);
    json(['token'=>$token,'user'=>$user]);
  }

  if ($action === 'update_profile') {
    $me = require_user();
    $profile = $input['profile'] ?? [];
    $first = $profile['first_name'] ?? null;
    $last = $profile['last_name'] ?? null;
    $phone = $profile['phone'] ?? null;
    $city = $profile['city'] ?? null;
    $pdo->prepare('update users set first_name=?, last_name=?, phone=?, city=? where id=?')
        ->execute([$first,$last,$phone,$city,$me['id']]);
    $stmt = $pdo->prepare('select id,email,first_name,last_name,phone,city from users where id=?');
    $stmt->execute([$me['id']]);
    $user = $stmt->fetch();
    json(['user'=>$user]);
  }

  json(['error'=>'Action inconnue'], 400);
}

json(['error'=>'Méthode non autorisée'], 405);
