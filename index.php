<?php
// index.php
// Porta de entrada do planner: mostra a tela de entrada a quem não está identificado
// e entrega o gerador somente a quem entrou com uma conta autorizada.
declare(strict_types=1);

require __DIR__ . '/app/bootstrap.php';

set_exception_handler(static function (Throwable $ex): void {
    error_log('[planner] ' . get_class($ex) . ': ' . $ex->getMessage() . ' em ' . $ex->getFile() . ':' . $ex->getLine());
    http_response_code(500);
    header('Content-Type: text/html; charset=utf-8');
    echo '<!DOCTYPE html><html lang="pt-BR"><meta charset="utf-8"><title>Gerador de Planner</title>'
        . '<p style="font:16px sans-serif;margin:40px">Ocorreu um erro interno. Tente novamente em instantes.</p></html>';
});

start_session();
header('Cache-Control: no-store');
header('Content-Type: text/html; charset=utf-8');

$identity = access_identity();
if ($identity === null) {
    require __DIR__ . '/app/views/login.php';
    exit;
}

// O gerador é um modelo HTML; só entram nele o nome, o e-mail e o token da sessão, sempre escapados.
$html = (string) file_get_contents(__DIR__ . '/app/views/gerador.html');
echo strtr($html, [
    '{{USER_NAME}}'  => e($identity['name']),
    '{{USER_EMAIL}}' => e($identity['email']),
    '{{CSRF}}'       => e(csrf_token()),
]);
