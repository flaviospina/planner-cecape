<?php
// app/view.php
// Moldura das páginas administrativas em PHP (instalar.php e usuarios.php).
declare(strict_types=1);

const ASSET_VERSION = '5';

/** Em páginas HTML, erros não tratados viram uma mensagem amigável (o detalhe vai para o log). */
function page_mode(): void
{
    set_exception_handler(static function (Throwable $ex): void {
        error_log('[planner] ' . get_class($ex) . ': ' . $ex->getMessage() . ' em ' . $ex->getFile() . ':' . $ex->getLine());
        http_response_code(500);
        $msg = $ex instanceof PDOException
            ? 'Não foi possível acessar o banco de dados. Confira o arquivo .env e se o arquivo sql/schema.sql foi importado no phpMyAdmin.'
            : 'Ocorreu um erro interno. Tente novamente em instantes.';
        if (!headers_sent()) {
            page_header('Erro');
        }
        echo '<p class="alert alert-error">' . e($msg) . '</p>';
        page_footer();
        exit;
    });
}

function page_header(string $title): void
{
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-store');
    $v = ASSET_VERSION;
    echo '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">'
        . '<meta name="viewport" content="width=device-width, initial-scale=1">'
        . '<meta name="robots" content="noindex">'
        . '<title>' . e($title) . ' — Gerador de Planner</title>'
        . '<link rel="stylesheet" href="assets/css/app.css?v=' . $v . '">'
        . '<link rel="stylesheet" href="assets/css/admin.css?v=' . $v . '">'
        . '</head><body>'
        . '<header class="topbar"><div class="brand"><span class="brand-bar"><i></i><i></i><i></i><i></i></span>'
        . '<strong>Gerador de Planner</strong></div>'
        . '<div class="topbar-actions"><a class="btn btn-small" href="index.html">Voltar ao gerador</a></div></header>'
        . '<main class="admin"><h1>' . e($title) . '</h1>';
}

function page_footer(): void
{
    $v = ASSET_VERSION;
    echo '</main>'
        . '<script src="assets/vendor/sweetalert2.all.min.js?v=' . $v . '"></script>'
        . '<script src="assets/js/dialogs.js?v=' . $v . '"></script>'
        . '<script src="assets/js/admin.js?v=' . $v . '"></script>'
        . '</body></html>';
}

/** Mensagem guardada na sessão para aparecer depois do redirecionamento. */
function flash(string $type, string $text): void
{
    $_SESSION['flash'] = ['type' => $type, 'text' => $text];
}

function show_flash(): void
{
    if (!empty($_SESSION['flash'])) {
        $f = $_SESSION['flash'];
        unset($_SESSION['flash']);
        echo '<p class="alert alert-' . e($f['type']) . '" data-flash="' . e($f['type']) . '">' . e($f['text']) . '</p>';
    }
}

function redirect_to(string $page): never
{
    header('Location: ' . $page, true, 303);
    exit;
}
