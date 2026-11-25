<?php
// api/login.php
// POST { email, password }: autentica e abre a sessão.
declare(strict_types=1);

require dirname(__DIR__) . '/app/bootstrap.php';
api_mode();
start_session();
api_require_post();

$body = json_body();
$result = attempt_password_login((string) ($body['email'] ?? ''), (string) ($body['password'] ?? ''));
if (!$result['ok']) {
    json_response(false, null, $result['message'], $result['status']);
}
json_response(true, ['user' => public_user($result['user']), 'csrf' => csrf_token()], $result['message']);
