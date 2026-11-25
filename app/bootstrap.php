<?php
// app/bootstrap.php
// Base comum das páginas e APIs em PHP: configuração, sessão, autenticação, CSRF e registro de ações.
declare(strict_types=1);

require __DIR__ . '/config.php';
require __DIR__ . '/Database.php';
require __DIR__ . '/auth.php';

// ----- Respostas -----

/** Resposta JSON padronizada das APIs: { ok, data, mensagem }. */
function json_response(bool $ok, mixed $data = null, string $msg = '', int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode(['ok' => $ok, 'data' => $data, 'mensagem' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

/** Escapa texto para saída em HTML. */
function e(?string $text): string
{
    return htmlspecialchars((string) $text, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/**
 * Nas APIs, qualquer erro não tratado vira uma resposta JSON amigável (o detalhe vai para o log).
 * Chamar no início de cada arquivo de /api.
 */
function api_mode(): void
{
    set_exception_handler(static function (Throwable $ex): void {
        error_log('[planner] ' . get_class($ex) . ': ' . $ex->getMessage() . ' em ' . $ex->getFile() . ':' . $ex->getLine());
        if ($ex instanceof PDOException) {
            json_response(false, null, 'Não foi possível acessar o banco de dados. Verifique a instalação (arquivo .env e tabelas).', 503);
        }
        json_response(false, null, 'Ocorreu um erro interno. Tente novamente em instantes.', 500);
    });
    if (!has_database()) {
        json_response(false, null, 'Os modelos no servidor não estão ativados nesta instalação.', 503);
    }
}

// ----- Sessão -----

function is_https(): bool
{
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
}

function client_ip(): string
{
    return substr((string) ($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45);
}

function start_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    session_name('planner_cecape');
    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/',
        'secure'   => is_https(),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();

    // Encerra sessões paradas há muito tempo.
    $now = time();
    if (isset($_SESSION['last_seen']) && $now - (int) $_SESSION['last_seen'] > SESSION_IDLE_SECONDS) {
        $_SESSION = [];
        session_regenerate_id(true);
    }
    $_SESSION['last_seen'] = $now;

    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
}

function csrf_token(): string
{
    return (string) $_SESSION['csrf'];
}

/** Confere o token CSRF enviado no cabeçalho X-CSRF-Token (APIs) ou no campo "csrf" (formulários). */
function csrf_is_valid(): bool
{
    $sent = (string) ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? $_POST['csrf'] ?? '');
    return $sent !== '' && hash_equals(csrf_token(), $sent);
}

// ----- Autenticação -----

/** Usuário da sessão, relido do banco a cada requisição (para respeitar desativações). */
function current_user(): ?array
{
    static $cache = false;
    if ($cache !== false) {
        return $cache;
    }
    $cache = null;
    $id = (int) ($_SESSION['user_id'] ?? 0);
    if ($id > 0) {
        $st = Database::get()->prepare(
            'SELECT id, name, email, role, must_change_password FROM users WHERE id = :id AND active = 1'
        );
        $st->execute(['id' => $id]);
        $cache = $st->fetch() ?: null;
        if ($cache === null) {
            unset($_SESSION['user_id']);
        }
    }
    return $cache;
}

function public_user(array $user): array
{
    return [
        'id'                 => (int) $user['id'],
        'name'               => $user['name'],
        'email'              => $user['email'],
        'role'               => $user['role'],
        'mustChangePassword' => (bool) $user['must_change_password'],
    ];
}

/** Regras das APIs que alteram dados: método POST e token CSRF válido. */
function api_require_post(): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        json_response(false, null, 'Método não permitido.', 405);
    }
    if (!csrf_is_valid()) {
        json_response(false, null, 'Sua sessão expirou. Recarregue a página e tente novamente.', 403);
    }
}

function api_require_login(bool $allowPendingPassword = false): array
{
    $user = current_user();
    if ($user === null) {
        json_response(false, null, 'Entre com seu e-mail e senha para continuar.', 401);
    }
    if (!$allowPendingPassword && (int) $user['must_change_password'] === 1) {
        json_response(false, null, 'Troque a senha provisória antes de continuar.', 403);
    }
    return $user;
}

/** Corpo da requisição em JSON, como array. */
function json_body(): array
{
    $raw = file_get_contents('php://input', false, null, 0, MAX_CONFIG_BYTES + 65536);
    $data = json_decode((string) $raw, true);
    if (!is_array($data)) {
        json_response(false, null, 'Dados inválidos.', 422);
    }
    return $data;
}

function password_problem(string $password): ?string
{
    if (mb_strlen($password) < MIN_PASSWORD_LENGTH) {
        return 'A senha precisa ter pelo menos ' . MIN_PASSWORD_LENGTH . ' caracteres.';
    }
    if (strlen($password) > 200) {
        return 'A senha é longa demais.';
    }
    return null;
}

// ----- Registro de ações -----

function log_action(?int $userId, string $action, string $details = ''): void
{
    $st = Database::get()->prepare(
        'INSERT INTO action_logs (user_id, action, details, ip) VALUES (:user_id, :action, :details, :ip)'
    );
    $st->execute([
        'user_id' => $userId,
        'action'  => $action,
        'details' => mb_substr($details, 0, 255),
        'ip'      => client_ip(),
    ]);
}
