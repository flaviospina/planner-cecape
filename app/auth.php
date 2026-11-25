<?php
// app/auth.php
// Controle de acesso ao planner.
//   - Contas do domínio institucional entram pelo Google (OpenID Connect): é o Google que confirma
//     que a conta existe e pertence a quem está entrando. O planner não guarda senha dessas contas.
//   - Pessoas de fora do domínio entram por e-mail e senha, em contas criadas pelo administrador
//     na tela "Usuários" (exige o banco de dados).
declare(strict_types=1);

// ----- Situação da instalação -----

function has_database(): bool
{
    return ENV_FILE_EXISTS && DB_NAME !== '';
}

function google_configured(): bool
{
    return GOOGLE_CLIENT_ID !== '' && GOOGLE_CLIENT_SECRET !== '';
}

/** Endereço público do planner, sem barra no final (usado no retorno do Google). */
function app_base_url(): string
{
    if (APP_URL !== '') {
        return APP_URL;
    }
    $host = (string) ($_SERVER['HTTP_HOST'] ?? 'localhost');
    $dir = rtrim(str_replace('\\', '/', dirname((string) ($_SERVER['SCRIPT_NAME'] ?? '/'))), '/');
    // Os arquivos de /auth e /api ficam uma pasta abaixo da raiz do planner.
    $dir = preg_replace('#/(auth|api)$#', '', $dir);
    return (is_https() ? 'https' : 'http') . '://' . $host . $dir;
}

// ----- Sessão de acesso -----

/**
 * Quem está usando o planner, ou null se ninguém entrou.
 * Retorna ['email', 'name', 'via' => 'google' | 'password'].
 */
function access_identity(): ?array
{
    $access = $_SESSION['access'] ?? null;
    if (!is_array($access) || empty($access['email'])) {
        return null;
    }
    // Contas por senha são conferidas no banco a cada acesso: desativar o usuário tira o acesso na hora.
    if (($access['via'] ?? '') === 'password' && current_user() === null) {
        revoke_access();
        return null;
    }
    return $access;
}

function grant_access(string $email, string $name, string $via, ?int $userId): void
{
    session_regenerate_id(true);
    $_SESSION['access'] = ['email' => $email, 'name' => $name !== '' ? $name : $email, 'via' => $via];
    if ($userId !== null) {
        $_SESSION['user_id'] = $userId;
    } else {
        unset($_SESSION['user_id']);
    }
    $_SESSION['csrf'] = bin2hex(random_bytes(32));
}

function revoke_access(): void
{
    $_SESSION = [];
    session_regenerate_id(true);
    $_SESSION['csrf'] = bin2hex(random_bytes(32));
}

/** Nas APIs: só responde a quem entrou no planner. */
function api_require_access(): array
{
    $identity = access_identity();
    if ($identity === null) {
        json_response(false, null, 'Sua sessão terminou. Recarregue a página e entre novamente.', 401);
    }
    return $identity;
}

// ----- Regras de quem pode entrar pelo Google -----

/**
 * A conta do Google pode entrar?
 * $hostedDomain é o campo "hd" que o Google informa para contas de organizações (Google Workspace).
 */
function google_account_allowed(string $email, string $hostedDomain): bool
{
    $email = mb_strtolower($email);
    if (in_array($email, AUTH_EXTRA_EMAILS, true)) {
        return true;
    }
    // Exige as duas coisas: o e-mail termina com o domínio E o Google atesta que a conta é da organização.
    return AUTH_DOMAIN !== ''
        && str_ends_with($email, '@' . AUTH_DOMAIN)
        && mb_strtolower($hostedDomain) === AUTH_DOMAIN;
}

// ----- Login com o Google (OpenID Connect, fluxo "authorization code") -----

function google_redirect_uri(): string
{
    return app_base_url() . '/auth/callback.php';
}

/** Monta o endereço de login do Google e guarda na sessão os valores que protegem o retorno. */
function google_login_url(): string
{
    $_SESSION['oauth_state'] = bin2hex(random_bytes(24));
    $_SESSION['oauth_nonce'] = bin2hex(random_bytes(24));
    $params = [
        'client_id'     => GOOGLE_CLIENT_ID,
        'redirect_uri'  => google_redirect_uri(),
        'response_type' => 'code',
        'scope'         => 'openid email profile',
        'state'         => $_SESSION['oauth_state'],
        'nonce'         => $_SESSION['oauth_nonce'],
        'prompt'        => 'select_account',
    ];
    if (AUTH_DOMAIN !== '') {
        $params['hd'] = AUTH_DOMAIN; // sugere ao Google mostrar só as contas da organização
    }
    return GOOGLE_AUTH_URL . '?' . http_build_query($params);
}

/** POST com campos de formulário. Retorna [código HTTP, corpo]. */
function http_post_form(string $url, array $fields): array
{
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => http_build_query($fields),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_CONNECTTIMEOUT => 8,
        CURLOPT_HTTPHEADER     => ['Accept: application/json'],
    ]);
    $body = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    if ($body === false) {
        throw new RuntimeException('Falha de conexão com o Google: ' . $error);
    }
    return [$status, (string) $body];
}

/**
 * Troca o código recebido do Google pelos dados da conta e confere tudo o que precisa ser conferido.
 * Retorna ['email', 'name', 'hd']. Lança RuntimeException se algo não estiver certo.
 *
 * A assinatura do "id_token" não é verificada aqui porque ele é recebido diretamente do Google,
 * por HTTPS, em troca do segredo do cliente — caso em que a documentação do Google dispensa a verificação.
 */
function google_fetch_account(string $code): array
{
    [$status, $body] = http_post_form(GOOGLE_TOKEN_URL, [
        'code'          => $code,
        'client_id'     => GOOGLE_CLIENT_ID,
        'client_secret' => GOOGLE_CLIENT_SECRET,
        'redirect_uri'  => google_redirect_uri(),
        'grant_type'    => 'authorization_code',
    ]);
    $data = json_decode($body, true);
    if ($status !== 200 || !is_array($data) || empty($data['id_token'])) {
        throw new RuntimeException('O Google recusou a troca do código (HTTP ' . $status . '): ' . substr($body, 0, 300));
    }

    $parts = explode('.', (string) $data['id_token']);
    $claims = count($parts) === 3 ? json_decode((string) base64_decode(strtr($parts[1], '-_', '+/')), true) : null;
    if (!is_array($claims)) {
        throw new RuntimeException('Resposta do Google em formato inesperado.');
    }

    $issuer = (string) ($claims['iss'] ?? '');
    if (!in_array($issuer, GOOGLE_ISSUERS, true)) {
        throw new RuntimeException('Emissor inesperado: ' . $issuer);
    }
    if (($claims['aud'] ?? '') !== GOOGLE_CLIENT_ID) {
        throw new RuntimeException('Resposta emitida para outro aplicativo.');
    }
    if ((int) ($claims['exp'] ?? 0) < time() - 60) {
        throw new RuntimeException('Resposta do Google vencida.');
    }
    $nonce = (string) ($_SESSION['oauth_nonce'] ?? '');
    if ($nonce === '' || !hash_equals($nonce, (string) ($claims['nonce'] ?? ''))) {
        throw new RuntimeException('Resposta do Google não corresponde a este pedido de login.');
    }
    if (empty($claims['email']) || ($claims['email_verified'] ?? false) !== true) {
        throw new RuntimeException('O Google não confirmou o e-mail desta conta.');
    }

    return [
        'email' => mb_strtolower((string) $claims['email']),
        'name'  => trim((string) ($claims['name'] ?? '')),
        'hd'    => (string) ($claims['hd'] ?? ''),
    ];
}

/**
 * Com o banco configurado, quem entra pelo Google ganha um cadastro (sem senha utilizável),
 * para poder guardar modelos no servidor. Retorna o id do usuário, ou null se não foi possível.
 */
function provision_google_user(string $email, string $name): ?int
{
    if (!has_database()) {
        return null;
    }
    try {
        $pdo = Database::get();
        $st = $pdo->prepare('SELECT id, active FROM users WHERE email = :email');
        $st->execute(['email' => $email]);
        $row = $st->fetch();
        if ($row) {
            // Conta desativada pelo administrador: entra no gerador, mas sem os modelos do servidor.
            return (int) $row['active'] === 1 ? (int) $row['id'] : null;
        }
        $st = $pdo->prepare("INSERT INTO users (name, email, password_hash, role) VALUES (:name, :email, :hash, 'editor')");
        $st->execute([
            'name'  => mb_substr($name !== '' ? $name : $email, 0, 100),
            'email' => $email,
            // Senha aleatória que ninguém conhece: esta conta só entra pelo Google.
            'hash'  => password_hash(bin2hex(random_bytes(32)), PASSWORD_DEFAULT),
        ]);
        return (int) $pdo->lastInsertId();
    } catch (Throwable $ex) {
        error_log('[planner] cadastro de conta Google falhou: ' . $ex->getMessage());
        return null;
    }
}

/** Registra o acesso quando há banco; sem banco, apenas segue. */
function log_access(?int $userId, string $action, string $details): void
{
    if (!has_database()) {
        return;
    }
    try {
        log_action($userId, $action, $details);
    } catch (Throwable $ex) {
        error_log('[planner] registro de acesso falhou: ' . $ex->getMessage());
    }
}

// ----- Login por e-mail e senha (contas criadas pelo administrador) -----

/**
 * Confere e-mail e senha. Retorna ['ok' => bool, 'status' => código HTTP, 'message' => texto, 'user' => linha ou null].
 * Em caso de sucesso, a sessão de acesso já fica aberta.
 */
function attempt_password_login(string $email, string $password): array
{
    $email = mb_strtolower(trim($email));
    if ($email === '' || $password === '' || mb_strlen($email) > 190 || strlen($password) > 200) {
        return ['ok' => false, 'status' => 422, 'message' => 'Informe o e-mail e a senha.', 'user' => null];
    }
    $pdo = Database::get();

    // Limite de tentativas: falhas recentes para o mesmo e-mail ou vindas do mesmo IP.
    $st = $pdo->prepare(
        "SELECT COALESCE(SUM(details = :email), 0) AS by_email, COALESCE(SUM(ip = :ip), 0) AS by_ip
           FROM action_logs
          WHERE action = 'login_failed'
            AND created_at > DATE_SUB(NOW(), INTERVAL " . LOGIN_WINDOW_MINUTES . " MINUTE)
            AND (details = :email2 OR ip = :ip2)"
    );
    $st->execute(['email' => $email, 'ip' => client_ip(), 'email2' => $email, 'ip2' => client_ip()]);
    $fails = $st->fetch();
    if ((int) $fails['by_email'] >= LOGIN_MAX_FAILURES || (int) $fails['by_ip'] >= LOGIN_MAX_FAILURES * 4) {
        return ['ok' => false, 'status' => 429, 'user' => null,
            'message' => 'Muitas tentativas. Aguarde ' . LOGIN_WINDOW_MINUTES . ' minutos e tente novamente.'];
    }

    $st = $pdo->prepare('SELECT id, name, email, role, password_hash, must_change_password FROM users WHERE email = :email AND active = 1');
    $st->execute(['email' => $email]);
    $user = $st->fetch();

    // Quando o e-mail não existe, verifica contra um hash fixo para o tempo de resposta não denunciar isso.
    $hash = $user ? $user['password_hash'] : '$2y$10$usesomesillystringfore7hnbRJHxXVLeakoG8K30oukPsA.ztMG';
    $valid = password_verify($password, $hash);
    if (!$user || !$valid) {
        log_action(null, 'login_failed', $email);
        return ['ok' => false, 'status' => 401, 'message' => 'E-mail ou senha incorretos.', 'user' => null];
    }

    if (password_needs_rehash($user['password_hash'], PASSWORD_DEFAULT)) {
        $up = $pdo->prepare('UPDATE users SET password_hash = :hash WHERE id = :id');
        $up->execute(['hash' => password_hash($password, PASSWORD_DEFAULT), 'id' => $user['id']]);
    }

    grant_access($user['email'], $user['name'], 'password', (int) $user['id']);
    log_action((int) $user['id'], 'login');
    return ['ok' => true, 'status' => 200, 'message' => 'Bem-vindo(a), ' . $user['name'] . '.', 'user' => $user];
}
