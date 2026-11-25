<?php
// auth/google.php
// Inicia o login com a conta Google institucional: leva a pessoa para a tela do Google.
declare(strict_types=1);

require dirname(__DIR__) . '/app/bootstrap.php';
start_session();

if (!google_configured()) {
    $_SESSION['login_error'] = 'O login com a conta Google ainda não foi configurado neste servidor.';
    header('Location: ../', true, 303);
    exit;
}
header('Cache-Control: no-store');
header('Location: ' . google_login_url(), true, 302);
