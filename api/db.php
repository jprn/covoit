<?php
// DB connection settings (Hostinger MySQL)
// Rename this file to db.local.php in production and include it instead to keep secrets out of VCS
$DB_HOST = getenv('DB_HOST') ?: 'localhost';
$DB_NAME = getenv('DB_NAME') ?: 'sportride';
$DB_USER = getenv('DB_USER') ?: 'root';
$DB_PASS = getenv('DB_PASS') ?: '';
$DB_CHARSET = 'utf8mb4';

function db() {
  static $pdo = null;
  if ($pdo) return $pdo;
  global $DB_HOST, $DB_NAME, $DB_USER, $DB_PASS, $DB_CHARSET;
  $dsn = "mysql:host=$DB_HOST;dbname=$DB_NAME;charset=$DB_CHARSET";
  $opt = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
  ];
  $pdo = new PDO($dsn, $DB_USER, $DB_PASS, $opt);
  return $pdo;
}

function json($data, $code = 200) {
  http_response_code($code);
  header('Content-Type: application/json');
  echo json_encode($data);
  exit;
}

function bearer_user() {
  $hdr = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
  if (!preg_match('/Bearer\s+(.*)/', $hdr, $m)) return null;
  $token = $m[1];
  $pdo = db();
  $stmt = $pdo->prepare('select u.* from sessions s join users u on u.id=s.user_id where s.token=? and s.expires_at>now()');
  $stmt->execute([$token]);
  $user = $stmt->fetch();
  return $user ?: null;
}

function require_user() {
  $u = bearer_user();
  if (!$u) json(['error' => 'Unauthorized'], 401);
  return $u;
}
