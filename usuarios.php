<?php
// usuarios.php
// Cadastro de usuários (somente administradores): criar, ativar/desativar, mudar perfil,
// redefinir senha e excluir (inclusive para atender pedido de exclusão de dados — LGPD).
declare(strict_types=1);

require __DIR__ . '/app/bootstrap.php';
require __DIR__ . '/app/view.php';
page_mode();

if (!ENV_FILE_EXISTS || DB_NAME === '') {
    redirect_to('instalar.php');
}

start_session();
$me = current_user();

if ($me === null || $me['role'] !== 'admin' || (int) $me['must_change_password'] === 1) {
    http_response_code($me === null ? 401 : 403);
    page_header('Usuários');
    echo '<p class="alert alert-error">Esta página é restrita a administradores. '
        . 'Entre pelo gerador, em <strong>Modelos no servidor</strong>, e volte aqui.</p>';
    page_footer();
    exit;
}

$pdo = Database::get();
$myId = (int) $me['id'];

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    if (!csrf_is_valid()) {
        flash('error', 'Sua sessão expirou. Tente novamente.');
        redirect_to('usuarios.php');
    }
    $action = (string) ($_POST['action'] ?? '');
    $id = (int) ($_POST['id'] ?? 0);

    // Usuário-alvo das ações sobre cadastros existentes.
    $target = null;
    if ($action !== 'create') {
        $st = $pdo->prepare('SELECT id, name, email, role, active FROM users WHERE id = :id');
        $st->execute(['id' => $id]);
        $target = $st->fetch() ?: null;
        if ($target === null) {
            flash('error', 'Usuário não encontrado.');
            redirect_to('usuarios.php');
        }
        // O administrador não altera a própria conta por aqui: assim sempre resta um administrador ativo.
        if ($id === $myId && in_array($action, ['toggle', 'role', 'delete'], true)) {
            flash('error', 'Você não pode desativar, rebaixar ou excluir a sua própria conta.');
            redirect_to('usuarios.php');
        }
    }

    if ($action === 'create') {
        $name = trim((string) ($_POST['name'] ?? ''));
        $email = mb_strtolower(trim((string) ($_POST['email'] ?? '')));
        $role = ($_POST['role'] ?? '') === 'admin' ? 'admin' : 'editor';
        $password = (string) ($_POST['password'] ?? '');
        $problem = password_problem($password);

        if ($name === '' || mb_strlen($name) > 100) {
            flash('error', 'Informe o nome (até 100 caracteres).');
        } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 190) {
            flash('error', 'Informe um e-mail válido.');
        } elseif ($problem !== null) {
            flash('error', $problem);
        } else {
            $st = $pdo->prepare('SELECT COUNT(*) FROM users WHERE email = :email');
            $st->execute(['email' => $email]);
            if ((int) $st->fetchColumn() > 0) {
                flash('error', 'Já existe um usuário com este e-mail.');
            } else {
                $st = $pdo->prepare(
                    'INSERT INTO users (name, email, password_hash, role, must_change_password)
                     VALUES (:name, :email, :hash, :role, 1)'
                );
                $st->execute([
                    'name' => $name, 'email' => $email, 'role' => $role,
                    'hash' => password_hash($password, PASSWORD_DEFAULT),
                ]);
                log_action($myId, 'user_created', $email . ' (' . $role . ')');
                flash('ok', 'Usuário criado. Informe a senha provisória a ' . $name . '; ela será trocada no primeiro acesso.');
            }
        }
    } elseif ($action === 'toggle') {
        $new = (int) $target['active'] === 1 ? 0 : 1;
        $pdo->prepare('UPDATE users SET active = :a WHERE id = :id')->execute(['a' => $new, 'id' => $id]);
        log_action($myId, $new ? 'user_enabled' : 'user_disabled', $target['email']);
        flash('ok', $target['name'] . ($new ? ' foi reativado(a).' : ' foi desativado(a) e não consegue mais entrar.'));
    } elseif ($action === 'role') {
        $new = $target['role'] === 'admin' ? 'editor' : 'admin';
        $pdo->prepare('UPDATE users SET role = :r WHERE id = :id')->execute(['r' => $new, 'id' => $id]);
        log_action($myId, 'user_role_changed', $target['email'] . ' -> ' . $new);
        flash('ok', $target['name'] . ' agora é ' . ($new === 'admin' ? 'administrador(a).' : 'editor(a).'));
    } elseif ($action === 'reset') {
        $password = (string) ($_POST['password'] ?? '');
        $problem = password_problem($password);
        if ($problem !== null) {
            flash('error', $problem);
        } else {
            $pdo->prepare('UPDATE users SET password_hash = :hash, must_change_password = 1 WHERE id = :id')
                ->execute(['hash' => password_hash($password, PASSWORD_DEFAULT), 'id' => $id]);
            log_action($myId, 'user_password_reset', $target['email']);
            flash('ok', 'Senha provisória definida para ' . $target['name'] . '. Ela será trocada no próximo acesso.');
        }
    } elseif ($action === 'delete') {
        // Os modelos do usuário são excluídos junto (chave estrangeira com ON DELETE CASCADE).
        $pdo->prepare('DELETE FROM users WHERE id = :id')->execute(['id' => $id]);
        log_action($myId, 'user_deleted', 'usuário #' . $id);
        flash('ok', 'Usuário e seus modelos foram excluídos.');
    } else {
        flash('error', 'Ação desconhecida.');
    }
    redirect_to('usuarios.php');
}

$users = $pdo->query(
    'SELECT u.id, u.name, u.email, u.role, u.active, u.must_change_password, u.created_at,
            (SELECT COUNT(*) FROM planner_templates t WHERE t.user_id = u.id) AS templates
       FROM users u
      ORDER BY u.name, u.id'
)->fetchAll();

page_header('Usuários');
show_flash();
$csrf = e(csrf_token());
?>
<section class="card">
  <h2>Novo usuário</h2>
  <form method="post" class="form-grid" autocomplete="off"
        data-confirm-title="Criar usuário?"
        data-confirm-text="A pessoa entrará com a senha provisória e precisará trocá-la no primeiro acesso."
        data-confirm-button="Criar usuário">
    <input type="hidden" name="csrf" value="<?= $csrf ?>">
    <input type="hidden" name="action" value="create">
    <label class="field"><span>Nome</span><input type="text" name="name" maxlength="100" required></label>
    <label class="field"><span>E-mail</span><input type="email" name="email" maxlength="190" required></label>
    <label class="field"><span>Perfil</span>
      <select name="role">
        <option value="editor">Editor (cria e usa modelos)</option>
        <option value="admin">Administrador (também gerencia usuários)</option>
      </select></label>
    <label class="field"><span>Senha provisória (mín. <?= MIN_PASSWORD_LENGTH ?> caracteres)</span>
      <input type="text" name="password" minlength="<?= MIN_PASSWORD_LENGTH ?>" maxlength="200" required autocomplete="off"></label>
    <div class="form-actions"><button type="submit" class="btn btn-primary">Criar usuário</button></div>
  </form>
  <p class="hint">São guardados apenas nome, e-mail e senha (criptografada), para permitir o acesso.
    A pedido do titular, use <strong>Excluir</strong> para apagar a conta e os modelos dela.</p>
</section>

<section class="card">
  <h2>Usuários cadastrados</h2>
  <div class="table-wrap">
    <table class="table">
      <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Situação</th><th>Modelos</th><th>Ações</th></tr></thead>
      <tbody>
<?php foreach ($users as $u):
    $uid = (int) $u['id'];
    $self = $uid === $myId;
    $name = e($u['name']);
?>
        <tr>
          <td><?= $name ?><?= $self ? ' <em>(você)</em>' : '' ?></td>
          <td><?= e($u['email']) ?></td>
          <td><?= $u['role'] === 'admin' ? 'Administrador' : 'Editor' ?></td>
          <td><?= (int) $u['active'] === 1 ? 'Ativo' : '<strong>Desativado</strong>' ?><?= (int) $u['must_change_password'] === 1 ? ' · senha provisória' : '' ?></td>
          <td><?= (int) $u['templates'] ?></td>
          <td class="actions">
            <form method="post" data-prompt-password="Senha provisória para <?= $name ?>"
                  data-confirm-button="Definir senha">
              <input type="hidden" name="csrf" value="<?= $csrf ?>">
              <input type="hidden" name="action" value="reset">
              <input type="hidden" name="id" value="<?= $uid ?>">
              <input type="hidden" name="password" value="">
              <button type="submit" class="btn btn-small">Redefinir senha</button>
            </form>
<?php if (!$self): ?>
            <form method="post"
                  data-confirm-title="<?= (int) $u['active'] === 1 ? 'Desativar' : 'Reativar' ?> <?= $name ?>?"
                  data-confirm-text="<?= (int) $u['active'] === 1 ? 'A pessoa não conseguirá mais entrar. Os modelos dela são mantidos.' : 'A pessoa voltará a conseguir entrar.' ?>"
                  data-confirm-button="<?= (int) $u['active'] === 1 ? 'Desativar' : 'Reativar' ?>">
              <input type="hidden" name="csrf" value="<?= $csrf ?>">
              <input type="hidden" name="action" value="toggle">
              <input type="hidden" name="id" value="<?= $uid ?>">
              <button type="submit" class="btn btn-small"><?= (int) $u['active'] === 1 ? 'Desativar' : 'Reativar' ?></button>
            </form>
            <form method="post"
                  data-confirm-title="Mudar o perfil de <?= $name ?>?"
                  data-confirm-text="<?= $u['role'] === 'admin' ? 'Passará a ser editor(a): continua usando os modelos, mas não gerencia usuários.' : 'Passará a ser administrador(a): poderá gerenciar usuários e alterar qualquer modelo.' ?>"
                  data-confirm-button="Mudar perfil">
              <input type="hidden" name="csrf" value="<?= $csrf ?>">
              <input type="hidden" name="action" value="role">
              <input type="hidden" name="id" value="<?= $uid ?>">
              <button type="submit" class="btn btn-small">Tornar <?= $u['role'] === 'admin' ? 'editor' : 'administrador' ?></button>
            </form>
            <form method="post"
                  data-confirm-title="Excluir <?= $name ?>?"
                  data-confirm-text="A conta e os <?= (int) $u['templates'] ?> modelo(s) dela serão apagados. Esta ação não pode ser desfeita."
                  data-confirm-button="Excluir" data-confirm-danger="1">
              <input type="hidden" name="csrf" value="<?= $csrf ?>">
              <input type="hidden" name="action" value="delete">
              <input type="hidden" name="id" value="<?= $uid ?>">
              <button type="submit" class="btn btn-small btn-danger">Excluir</button>
            </form>
<?php endif; ?>
          </td>
        </tr>
<?php endforeach; ?>
      </tbody>
    </table>
  </div>
</section>
<?php
page_footer();
