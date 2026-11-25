<?php
// sair.php
// Encerra o acesso ao planner e volta para a tela de entrada.
declare(strict_types=1);

require __DIR__ . '/app/bootstrap.php';
start_session();

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST' && csrf_is_valid()) {
    $identity = access_identity();
    if ($identity !== null) {
        log_access(isset($_SESSION['user_id']) ? (int) $_SESSION['user_id'] : null, 'logout', $identity['email']);
    }
    revoke_access();
    $_SESSION['login_notice'] = 'Você saiu do planner.';
}
header('Location: ./', true, 303);
