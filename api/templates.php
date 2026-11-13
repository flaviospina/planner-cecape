<?php
// api/templates.php
// Modelos de planner guardados no servidor.
//   GET             lista os modelos do usuário e os compartilhados
//   GET ?id=N       devolve um modelo com a configuração
//   POST { action: "save", id?, name, isShared, config }
//   POST { action: "delete", id }
declare(strict_types=1);

require dirname(__DIR__) . '/app/bootstrap.php';
api_mode();
start_session();

/**
 * LGPD: os nomes de alunos não são guardados no servidor.
 * No campo "classes" ficam apenas as linhas de definição de turma ("Turma: 5º A | seg, qua").
 */
function strip_student_names(array $config): array
{
    if (isset($config['classes']) && is_string($config['classes'])) {
        $kept = [];
        foreach (preg_split('/\r?\n/', $config['classes']) as $line) {
            if (preg_match('/^\s*turma\s*:/iu', $line)) {
                $kept[] = trim($line);
            }
        }
        $config['classes'] = implode("\n", $kept);
    }
    return $config;
}

$pdo = Database::get();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $user = api_require_login();
    $me = (int) $user['id'];

    if (isset($_GET['id'])) {
        $st = $pdo->prepare(
            'SELECT id, user_id, name, is_shared, config FROM planner_templates
              WHERE id = :id AND (user_id = :me OR is_shared = 1)'
        );
        $st->execute(['id' => (int) $_GET['id'], 'me' => $me]);
        $row = $st->fetch();
        $config = $row ? json_decode($row['config'], true) : null;
        if (!$row || !is_array($config)) {
            json_response(false, null, 'Modelo não encontrado.', 404);
        }
        json_response(true, [
            'id'       => (int) $row['id'],
            'name'     => $row['name'],
            'isShared' => (bool) $row['is_shared'],
            'mine'     => (int) $row['user_id'] === $me,
            'config'   => $config,
        ]);
    }

    $st = $pdo->prepare(
        'SELECT t.id, t.user_id, t.name, t.is_shared, COALESCE(t.updated_at, t.created_at) AS changed_at, u.name AS owner
           FROM planner_templates t
           JOIN users u ON u.id = t.user_id
          WHERE t.user_id = :me OR t.is_shared = 1
          ORDER BY t.name, t.id
          LIMIT 300'
    );
    $st->execute(['me' => $me]);
    $items = [];
    foreach ($st as $row) {
        $items[] = [
            'id'        => (int) $row['id'],
            'name'      => $row['name'],
            'isShared'  => (bool) $row['is_shared'],
            'mine'      => (int) $row['user_id'] === $me,
            'owner'     => $row['owner'],
            'changedAt' => $row['changed_at'],
        ];
    }
    json_response(true, ['items' => $items]);
}

api_require_post();
$user = api_require_login();
$me = (int) $user['id'];
$isAdmin = $user['role'] === 'admin';
$body = json_body();
$action = (string) ($body['action'] ?? '');
$id = (int) ($body['id'] ?? 0);

// Para alterar ou excluir: só o dono do modelo ou um administrador.
$owned = null;
if ($id > 0) {
    $st = $pdo->prepare('SELECT id, user_id, name FROM planner_templates WHERE id = :id');
    $st->execute(['id' => $id]);
    $owned = $st->fetch() ?: null;
    if ($owned === null) {
        json_response(false, null, 'Modelo não encontrado.', 404);
    }
    if ((int) $owned['user_id'] !== $me && !$isAdmin) {
        json_response(false, null, 'Só quem criou o modelo pode alterá-lo. Use "Salvar como novo" para ter a sua cópia.', 403);
    }
}

if ($action === 'delete') {
    if ($owned === null) {
        json_response(false, null, 'Informe o modelo.', 422);
    }
    $pdo->prepare('DELETE FROM planner_templates WHERE id = :id')->execute(['id' => $id]);
    log_action($me, 'template_deleted', '#' . $id . ' ' . $owned['name']);
    json_response(true, null, 'Modelo excluído.');
}

if ($action === 'save') {
    $name = trim((string) ($body['name'] ?? ''));
    $config = $body['config'] ?? null;
    if ($name === '' || mb_strlen($name) > 80) {
        json_response(false, null, 'Dê um nome ao modelo (até 80 caracteres).', 422);
    }
    if (!is_array($config) || array_is_list($config)) {
        json_response(false, null, 'Configuração do modelo inválida.', 422);
    }
    $json = json_encode(strip_student_names($config), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false || strlen($json) > MAX_CONFIG_BYTES) {
        json_response(false, null, 'O modelo é grande demais. Use um logotipo menor e tente novamente.', 422);
    }
    $isShared = !empty($body['isShared']) ? 1 : 0;

    if ($owned !== null) {
        $st = $pdo->prepare('UPDATE planner_templates SET name = :name, is_shared = :shared, config = :config, updated_at = NOW() WHERE id = :id');
        $st->execute(['name' => $name, 'shared' => $isShared, 'config' => $json, 'id' => $id]);
        log_action($me, 'template_updated', '#' . $id . ' ' . $name);
        json_response(true, ['id' => $id], 'Modelo atualizado.');
    }

    $st = $pdo->prepare('SELECT COUNT(*) FROM planner_templates WHERE user_id = :me');
    $st->execute(['me' => $me]);
    if ((int) $st->fetchColumn() >= MAX_TEMPLATES_PER_USER) {
        json_response(false, null, 'Você atingiu o limite de ' . MAX_TEMPLATES_PER_USER . ' modelos. Exclua algum para salvar outro.', 422);
    }
    $st = $pdo->prepare('INSERT INTO planner_templates (user_id, name, is_shared, config) VALUES (:me, :name, :shared, :config)');
    $st->execute(['me' => $me, 'name' => $name, 'shared' => $isShared, 'config' => $json]);
    $newId = (int) $pdo->lastInsertId();
    log_action($me, 'template_created', '#' . $newId . ' ' . $name);
    json_response(true, ['id' => $newId], 'Modelo salvo.');
}

json_response(false, null, 'Ação desconhecida.', 422);
