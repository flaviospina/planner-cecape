<?php
// instalar.php
// Cria o primeiro administrador. Só funciona enquanto não existe nenhum usuário cadastrado.
declare(strict_types=1);

require __DIR__ . '/app/bootstrap.php';
require __DIR__ . '/app/view.php';
page_mode();

if (!ENV_FILE_EXISTS || DB_NAME === '') {
    page_header('Instalação');
    echo '<p class="alert alert-error">O arquivo <strong>.env</strong> ainda não foi criado. '
        . 'No Gerenciador de Arquivos do cPanel, copie <strong>.env.example</strong> para <strong>.env</strong> '
        . 'e preencha os dados do banco de dados.</p>';
    page_footer();
    exit;
}

start_session();
$pdo = Database::get();
$hasUsers = (int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn() > 0;

$errors = [];
$name = '';
$email = '';

if (!$hasUsers && ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $name = trim((string) ($_POST['name'] ?? ''));
    $email = mb_strtolower(trim((string) ($_POST['email'] ?? '')));
    $password = (string) ($_POST['password'] ?? '');
    $confirm = (string) ($_POST['password_confirm'] ?? '');

    if (!csrf_is_valid()) {
        $errors[] = 'Sua sessão expirou. Envie o formulário novamente.';
    }
    if ($name === '' || mb_strlen($name) > 100) {
        $errors[] = 'Informe o nome (até 100 caracteres).';
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 190) {
        $errors[] = 'Informe um e-mail válido.';
    }
    $problem = password_problem($password);
    if ($problem !== null) {
        $errors[] = $problem;
    } elseif ($password !== $confirm) {
        $errors[] = 'A confirmação da senha não confere.';
    }

    if (!$errors) {
        $st = $pdo->prepare("INSERT INTO users (name, email, password_hash, role) VALUES (:name, :email, :hash, 'admin')");
        $st->execute(['name' => $name, 'email' => $email, 'hash' => password_hash($password, PASSWORD_DEFAULT)]);
        $id = (int) $pdo->lastInsertId();
        log_action($id, 'install_admin_created', $email);
        session_regenerate_id(true);
        $_SESSION['user_id'] = $id;
        flash('ok', 'Instalação concluída. Você já está conectado(a) como administrador(a).');
        redirect_to('usuarios.php');
    }
}

page_header('Instalação');

if ($hasUsers) {
    echo '<p class="alert alert-ok">A instalação já foi concluída. Novos usuários são cadastrados pelo administrador em '
        . '<a href="usuarios.php">Usuários</a>.</p>';
    page_footer();
    exit;
}

foreach ($errors as $error) {
    echo '<p class="alert alert-error">' . e($error) . '</p>';
}
?>
<p>Crie a conta do <strong>administrador</strong>. Ela poderá cadastrar os demais usuários e gerenciar os modelos compartilhados.</p>
<form method="post" class="card" autocomplete="off">
  <input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>">
  <label class="field"><span>Nome</span>
    <input type="text" name="name" maxlength="100" required value="<?= e($name) ?>"></label>
  <label class="field"><span>E-mail</span>
    <input type="email" name="email" maxlength="190" required value="<?= e($email) ?>"></label>
  <label class="field"><span>Senha (mínimo de <?= MIN_PASSWORD_LENGTH ?> caracteres)</span>
    <input type="password" name="password" minlength="<?= MIN_PASSWORD_LENGTH ?>" required autocomplete="new-password"></label>
  <label class="field"><span>Confirme a senha</span>
    <input type="password" name="password_confirm" minlength="<?= MIN_PASSWORD_LENGTH ?>" required autocomplete="new-password"></label>
  <p class="hint">Os dados servem apenas para o acesso a este sistema.</p>
  <button type="submit" class="btn btn-primary">Criar administrador</button>
</form>
<?php
page_footer();
