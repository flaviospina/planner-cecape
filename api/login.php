<?php
// api/login.php
// POST { email, password }: autentica e abre a sessão.
declare(strict_types=1);

require dirname(__DIR__) . '/app/bootstrap.php';
api_mode();
start_session();
api_require_post();

$body = json_body();
$email = mb_strtolower(trim((string) ($body['email'] ?? '')));
$password = (string) ($body['password'] ?? '');

if ($email === '' || $password === '' || mb_strlen($email) > 190 || strlen($password) > 200) {
    json_response(false, null, 'Informe o e-mail e a senha.', 422);
}

$pdo = Database::get();

// Limite de tentativas: falhas recentes para o mesmo e-mail ou vindas do mesmo IP.
$st = $pdo->prepare(
    "SELECT COALESCE(SUM(details = :email), 0) AS by_email, COALESCE(SUM(ip = :ip), 0) AS by_ip
       FROM action_logs
      WHERE action = 'login_failed'
        AND created_at > DATE_SUB(NOW(), INTERVAL " . LOGIN_WINDOW_MINUTES . " MINUTE)
        AND (details = :email2 OR ip = :ip2)"
);
$st->execute(['email' => $email, 'ip' => client_ip(), 'email2' => $email, 'ip2' => client_ip()]);
$fails = $st->fetch();
if ((int) $fails['by_email'] >= LOGIN_MAX_FAILURES || (int) $fails['by_ip'] >= LOGIN_MAX_FAILURES * 4) {
    json_response(false, null, 'Muitas tentativas. Aguarde ' . LOGIN_WINDOW_MINUTES . ' minutos e tente novamente.', 429);
}

$st = $pdo->prepare('SELECT id, name, email, role, password_hash, must_change_password FROM users WHERE email = :email AND active = 1');
$st->execute(['email' => $email]);
$user = $st->fetch();

// Quando o e-mail não existe, verifica contra um hash fixo para o tempo de resposta não denunciar isso.
$hash = $user ? $user['password_hash'] : '$2y$10$usesomesillystringfore7hnbRJHxXVLeakoG8K30oukPsA.ztMG';
$valid = password_verify($password, $hash);

if (!$user || !$valid) {
    log_action(null, 'login_failed', $email);
    json_response(false, null, 'E-mail ou senha incorretos.', 401);
}

if (password_needs_rehash($user['password_hash'], PASSWORD_DEFAULT)) {
    $up = $pdo->prepare('UPDATE users SET password_hash = :hash WHERE id = :id');
    $up->execute(['hash' => password_hash($password, PASSWORD_DEFAULT), 'id' => $user['id']]);
}

session_regenerate_id(true);
$_SESSION['user_id'] = (int) $user['id'];
$_SESSION['csrf'] = bin2hex(random_bytes(32));
log_action((int) $user['id'], 'login');

json_response(true, ['user' => public_user($user), 'csrf' => csrf_token()], 'Bem-vindo(a), ' . $user['name'] . '.');
