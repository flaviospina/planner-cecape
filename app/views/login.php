<?php
// app/views/login.php
// Tela de entrada do planner (incluída pelo index.php quando ninguém está identificado).
// É a única página pública: por isso leva também as metatags de compartilhamento.
declare(strict_types=1);

$error = (string) ($_SESSION['login_error'] ?? '');
$notice = (string) ($_SESSION['login_notice'] ?? '');
$showPassword = !empty($_SESSION['login_show_password']);
unset($_SESSION['login_error'], $_SESSION['login_notice'], $_SESSION['login_show_password']);

$google = google_configured();
$password = has_database();
$domain = AUTH_DOMAIN;
$site = 'https://sist.cecapescs.com.br/planner';
$v = '7';
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Gerador de Planner — CECAPE</title>
  <meta name="description" content="Monte, personalize e imprima o seu planner em PDF: calendário mensal e semanal, calendário letivo, feriados, anotações e muito mais.">
  <meta name="theme-color" content="#1a7185">
  <link rel="icon" type="image/png" href="assets/img/favicon.png">
  <link rel="apple-touch-icon" href="assets/img/icone-180.png">
  <link rel="canonical" href="<?= e($site) ?>/">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="CECAPE">
  <meta property="og:locale" content="pt_BR">
  <meta property="og:title" content="Gerador de Planner — CECAPE">
  <meta property="og:description" content="Monte, personalize e imprima o seu planner em PDF: calendário mensal e semanal, calendário letivo, feriados e anotações.">
  <meta property="og:url" content="<?= e($site) ?>/">
  <meta property="og:image" content="<?= e($site) ?>/assets/img/compartilhar.jpg">
  <meta property="og:image:secure_url" content="<?= e($site) ?>/assets/img/compartilhar.jpg">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Gerador de Planner do CECAPE, com a prévia de um calendário mensal">
  <meta property="og:image" content="<?= e($site) ?>/assets/img/compartilhar-quadrada.jpg">
  <meta property="og:image:secure_url" content="<?= e($site) ?>/assets/img/compartilhar-quadrada.jpg">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="1200">
  <meta property="og:image:alt" content="Gerador de Planner do CECAPE">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Gerador de Planner — CECAPE">
  <meta name="twitter:description" content="Monte, personalize e imprima o seu planner em PDF.">
  <meta name="twitter:image" content="<?= e($site) ?>/assets/img/compartilhar.jpg">
  <meta name="twitter:image:alt" content="Gerador de Planner do CECAPE, com a prévia de um calendário mensal">
  <link rel="stylesheet" href="assets/css/app.css?v=<?= $v ?>">
  <link rel="stylesheet" href="assets/css/login.css?v=<?= $v ?>">
</head>
<body class="login-page">

<main class="login">
  <img class="login-logo" src="assets/img/logo-cecape.jpg" alt="CECAPE — Centro de Capacitação dos Profissionais da Educação">
  <span class="brand-bar"><i></i><i></i><i></i><i></i></span>
  <h1>Gerador de Planner</h1>
  <p class="login-lead">Monte, personalize e imprima o seu planner em PDF.</p>

<?php if ($error !== ''): ?>
  <p class="alert alert-error" role="alert"><?= e($error) ?></p>
<?php endif; ?>
<?php if ($notice !== ''): ?>
  <p class="alert alert-ok" role="status"><?= e($notice) ?></p>
<?php endif; ?>

<?php if ($google): ?>
  <a class="btn btn-primary login-google" href="auth/google.php">Entrar com a conta @<?= e($domain) ?></a>
  <p class="hint">Você será levado à tela do Google para escolher a sua conta institucional.
    O planner não recebe nem guarda a sua senha.</p>
<?php elseif (!$password): ?>
  <p class="alert alert-error" role="alert">O acesso ainda não foi configurado neste servidor.
    Quem administra o sistema deve seguir a seção “Controle de acesso” do arquivo LEIA-ME.</p>
<?php endif; ?>

<?php if ($password): ?>
  <details class="login-other"<?= ($showPassword || !$google) ? ' open' : '' ?>>
    <summary>Não tenho conta @<?= e($domain) ?></summary>
    <p class="hint">Use o e-mail e a senha cadastrados para você pelo administrador do planner.</p>
    <form method="post" action="auth/senha.php" autocomplete="on">
      <input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>">
      <label class="field"><span>E-mail</span>
        <input type="email" name="email" maxlength="190" required autocomplete="username"></label>
      <label class="field"><span>Senha</span>
        <input type="password" name="password" maxlength="200" required autocomplete="current-password"></label>
      <button type="submit" class="btn">Entrar com e-mail e senha</button>
    </form>
  </details>
<?php endif; ?>

  <p class="login-foot">Acesso restrito aos profissionais da rede municipal de educação de São Caetano do Sul.
    Ao entrar, o planner recebe apenas o seu nome e o seu e-mail, usados para identificar o acesso.</p>
</main>

</body>
</html>
