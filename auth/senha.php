<?php
// auth/senha.php
// Login por e-mail e senha, para as contas criadas pelo administrador (pessoas de fora do domínio).
declare(strict_types=1);

require dirname(__DIR__) . '/app/bootstrap.php';
start_session();

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    if (!csrf_is_valid()) {
        $_SESSION['login_error'] = 'A página ficou aberta por muito tempo. Tente novamente.';
    } elseif (!has_database()) {
        $_SESSION['login_error'] = 'O login por e-mail e senha não está ativado neste servidor.';
    } else {
        try {
            $result = attempt_password_login((string) ($_POST['email'] ?? ''), (string) ($_POST['password'] ?? ''));
            if (!$result['ok']) {
                $_SESSION['login_error'] = $result['message'];
                $_SESSION['login_show_password'] = true;
            }
        } catch (Throwable $ex) {
            error_log('[planner] login por senha: ' . $ex->getMessage());
            $_SESSION['login_error'] = 'Não foi possível verificar a conta agora. Tente novamente em instantes.';
        }
    }
}
header('Location: ../', true, 303);
