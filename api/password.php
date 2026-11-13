<?php
// api/password.php
// POST { current, new }: o próprio usuário troca a senha (obrigatório quando a senha é provisória).
declare(strict_types=1);

require dirname(__DIR__) . '/app/bootstrap.php';
api_mode();
start_session();
api_require_post();
$user = api_require_login(true);

$body = json_body();
$current = (string) ($body['current'] ?? '');
$new = (string) ($body['new'] ?? '');

$problem = password_problem($new);
if ($problem !== null) {
    json_response(false, null, $problem, 422);
}
if ($new === $current) {
    json_response(false, null, 'A nova senha precisa ser diferente da atual.', 422);
}

$pdo = Database::get();
$st = $pdo->prepare('SELECT password_hash FROM users WHERE id = :id');
$st->execute(['id' => $user['id']]);
if (!password_verify($current, (string) $st->fetchColumn())) {
    log_action((int) $user['id'], 'password_change_failed');
    json_response(false, null, 'A senha atual não confere.', 422);
}

$up = $pdo->prepare('UPDATE users SET password_hash = :hash, must_change_password = 0 WHERE id = :id');
$up->execute(['hash' => password_hash($new, PASSWORD_DEFAULT), 'id' => $user['id']]);
session_regenerate_id(true);
log_action((int) $user['id'], 'password_changed');

$user['must_change_password'] = 0;
json_response(true, ['user' => public_user($user)], 'Senha alterada.');
