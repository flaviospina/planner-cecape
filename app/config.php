<?php
// app/config.php
// Lê o arquivo .env da raiz do projeto e define as constantes de configuração.
declare(strict_types=1);

$envFile = dirname(__DIR__) . '/.env';
define('ENV_FILE_EXISTS', is_file($envFile));
if (ENV_FILE_EXISTS) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        if (str_starts_with(trim($line), '#')) {
            continue;
        }
        [$k, $v] = array_map('trim', explode('=', $line, 2) + [1 => '']);
        $_ENV[$k] = $v;
    }
}

define('DB_HOST', $_ENV['DB_HOST'] ?? 'localhost');
define('DB_NAME', $_ENV['DB_NAME'] ?? '');
define('DB_USER', $_ENV['DB_USER'] ?? '');
define('DB_PASS', $_ENV['DB_PASS'] ?? '');
define('APP_ENV', $_ENV['APP_ENV'] ?? 'production');

// Controle de acesso
define('APP_URL', rtrim($_ENV['APP_URL'] ?? '', '/'));                    // endereço público do planner
define('AUTH_DOMAIN', mb_strtolower(trim($_ENV['AUTH_DOMAIN'] ?? 'scseduca.com.br')));
define('AUTH_EXTRA_EMAILS', array_values(array_filter(array_map(
    static fn (string $e): string => mb_strtolower(trim($e)),
    explode(',', $_ENV['AUTH_EXTRA_EMAILS'] ?? '')
))));
define('GOOGLE_CLIENT_ID', trim($_ENV['GOOGLE_CLIENT_ID'] ?? ''));
define('GOOGLE_CLIENT_SECRET', trim($_ENV['GOOGLE_CLIENT_SECRET'] ?? ''));
define('GOOGLE_ISSUERS', ['https://accounts.google.com', 'accounts.google.com']);
// Endereços do Google. Só podem ser trocados fora de produção, para testes automatizados.
$testing = APP_ENV !== 'production';
define('GOOGLE_AUTH_URL', $testing && !empty($_ENV['GOOGLE_AUTH_URL']) ? $_ENV['GOOGLE_AUTH_URL'] : 'https://accounts.google.com/o/oauth2/v2/auth');
define('GOOGLE_TOKEN_URL', $testing && !empty($_ENV['GOOGLE_TOKEN_URL']) ? $_ENV['GOOGLE_TOKEN_URL'] : 'https://oauth2.googleapis.com/token');

// Limites da aplicação
define('MAX_CONFIG_BYTES', 5 * 1024 * 1024); // tamanho máximo de um modelo (inclui o logotipo)
define('MAX_TEMPLATES_PER_USER', 50);
define('MIN_PASSWORD_LENGTH', 8);
define('SESSION_IDLE_SECONDS', 4 * 3600);
define('LOGIN_MAX_FAILURES', 5);             // por e-mail ou por IP, na janela abaixo
define('LOGIN_WINDOW_MINUTES', 15);

date_default_timezone_set('America/Sao_Paulo');
mb_internal_encoding('UTF-8');

error_reporting(E_ALL);
ini_set('log_errors', '1');
ini_set('error_log', dirname(__DIR__) . '/logs/php-error.log');
ini_set('display_errors', APP_ENV === 'production' ? '0' : '1');
