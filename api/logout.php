<?php
// api/logout.php
// POST: encerra a sessão.
declare(strict_types=1);

require dirname(__DIR__) . '/app/bootstrap.php';
api_mode();
start_session();
api_require_post();

$user = current_user();
if ($user) {
    log_action((int) $user['id'], 'logout');
}
$_SESSION = [];
session_regenerate_id(true);
$_SESSION['csrf'] = bin2hex(random_bytes(32));

json_response(true, ['csrf' => csrf_token()], 'Você saiu.');
