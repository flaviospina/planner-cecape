<?php
// api/session.php
// GET: informa se há usuário logado e entrega o token CSRF da sessão.
declare(strict_types=1);

require dirname(__DIR__) . '/app/bootstrap.php';
api_mode();
start_session();
api_require_access();

$user = current_user();
$installed = (int) Database::get()->query('SELECT COUNT(*) FROM users')->fetchColumn() > 0;

json_response(true, [
    'user'      => $user ? public_user($user) : null,
    'csrf'      => csrf_token(),
    'installed' => $installed,
]);
