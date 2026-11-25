<?php
// auth/callback.php
// Retorno do Google depois do login: confere a resposta, verifica se a conta pode entrar e abre a sessão.
declare(strict_types=1);

require dirname(__DIR__) . '/app/bootstrap.php';
start_session();

/** Volta para a tela de entrada com uma mensagem. */
function back_to_login(string $message): never
{
    unset($_SESSION['oauth_state'], $_SESSION['oauth_nonce']);
    $_SESSION['login_error'] = $message;
    header('Location: ../', true, 303);
    exit;
}

if (!google_configured()) {
    back_to_login('O login com a conta Google ainda não foi configurado neste servidor.');
}

// A pessoa cancelou na tela do Google, ou o Google devolveu um erro.
if (isset($_GET['error'])) {
    back_to_login($_GET['error'] === 'access_denied'
        ? 'O login foi cancelado. Para usar o planner, entre com a sua conta institucional.'
        : 'O Google não concluiu o login. Tente novamente.');
}

// O "state" garante que este retorno pertence ao pedido de login feito por este mesmo navegador.
$state = (string) ($_GET['state'] ?? '');
$expected = (string) ($_SESSION['oauth_state'] ?? '');
$code = (string) ($_GET['code'] ?? '');
if ($state === '' || $expected === '' || !hash_equals($expected, $state) || $code === '') {
    back_to_login('O pedido de login expirou. Tente novamente.');
}

try {
    $account = google_fetch_account($code);
} catch (Throwable $ex) {
    error_log('[planner] login Google: ' . $ex->getMessage());
    back_to_login('Não foi possível confirmar a sua conta no Google. Tente novamente em instantes.');
}

if (!google_account_allowed($account['email'], $account['hd'])) {
    log_access(null, 'login_denied', $account['email']);
    back_to_login('A conta ' . $account['email'] . ' não tem acesso. Entre com a sua conta @' . AUTH_DOMAIN . '.');
}

$userId = provision_google_user($account['email'], $account['name']);
grant_access($account['email'], $account['name'], 'google', $userId);
unset($_SESSION['oauth_state'], $_SESSION['oauth_nonce']);
log_access($userId, 'login_google', $account['email']);

header('Location: ../', true, 303);
