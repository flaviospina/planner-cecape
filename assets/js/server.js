// assets/js/server.js
// Modelos guardados no servidor (fase 4): entrar, listar, carregar, salvar, atualizar e excluir.
// Sem servidor PHP (por exemplo, abrindo o index.html direto do computador), esta seção fica oculta
// e o gerador funciona normalmente.
(function (global) {
  'use strict';

  (global.PlannerBuild = global.PlannerBuild || {}).server = 5;

  var UI = global.PlannerUI;
  var MIN_PASSWORD = 8;

  var section = document.getElementById('server');
  var loggedOut = document.getElementById('server-out');
  var loggedIn = document.getElementById('server-in');
  var statusText = document.getElementById('server-status');
  var userName = document.getElementById('server-user');
  var select = document.getElementById('server-list');
  var adminLink = document.getElementById('server-admin');
  var buttons = {
    login: document.getElementById('server-login'),
    load: document.getElementById('server-load'),
    saveNew: document.getElementById('server-save-new'),
    update: document.getElementById('server-update'),
    remove: document.getElementById('server-delete'),
    password: document.getElementById('server-password'),
    logout: document.getElementById('server-logout')
  };

  var csrf = '';
  var user = null;
  var items = [];

  // ----- Comunicação com as APIs -----

  // Resolve com { ok, data, mensagem, status }. Rejeita apenas quando não há API respondendo.
  function api(path, body) {
    var options = { credentials: 'same-origin', headers: { 'Accept': 'application/json' } };
    if (body !== undefined) {
      options.method = 'POST';
      options.headers['Content-Type'] = 'application/json';
      options.headers['X-CSRF-Token'] = csrf;
      options.body = JSON.stringify(body);
    }
    return fetch('api/' + path, options).then(function (response) {
      return response.text().then(function (text) {
        var data;
        try { data = JSON.parse(text); } catch (e) { data = null; }
        if (!data || typeof data.ok !== 'boolean') { throw new Error('api-indisponivel'); }
        data.status = response.status;
        return data;
      });
    });
  }

  // Executa uma chamada mostrando "aguarde" e tratando as falhas de forma uniforme.
  // Resolve com os dados em caso de sucesso, ou com null (o aviso de erro já foi mostrado).
  function call(waitText, path, body) {
    var wait = UI.busy(waitText);
    return api(path, body).then(function (res) {
      wait.close();
      if (res.ok) { return res; }
      if (res.status === 401) { user = null; paint(); }
      return UI.notify('error', 'Não foi possível concluir', res.mensagem).then(function () { return null; });
    }, function () {
      wait.close();
      return UI.notify('error', 'Servidor indisponível',
        'Não houve resposta do servidor. Verifique a conexão e tente novamente.').then(function () { return null; });
    });
  }

  // ----- Tela -----

  function selected() {
    var id = parseInt(select.value, 10);
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === id) { return items[i]; }
    }
    return null;
  }

  function paintButtons() {
    var item = selected();
    var canEdit = !!item && (item.mine || (user && user.role === 'admin'));
    buttons.load.disabled = !item;
    buttons.update.disabled = !canEdit;
    buttons.remove.disabled = !canEdit;
  }

  function paintList(keepId) {
    select.replaceChildren();
    if (!items.length) {
      var empty = document.createElement('option');
      empty.value = '';
      empty.textContent = 'Nenhum modelo salvo ainda';
      select.appendChild(empty);
    }
    [['Meus modelos', true], ['Compartilhados por colegas', false]].forEach(function (group) {
      var list = items.filter(function (it) { return it.mine === group[1]; });
      if (!list.length) { return; }
      var og = document.createElement('optgroup');
      og.label = group[0];
      list.forEach(function (it) {
        var op = document.createElement('option');
        op.value = String(it.id);
        op.textContent = it.name + (it.mine ? (it.isShared ? ' (compartilhado)' : '') : ' — ' + it.owner);
        og.appendChild(op);
      });
      select.appendChild(og);
    });
    if (keepId) { select.value = String(keepId); }
    paintButtons();
  }

  function paint() {
    loggedOut.hidden = !!user;
    loggedIn.hidden = !user;
    if (user) {
      userName.textContent = user.name;
      adminLink.hidden = user.role !== 'admin';
    }
  }

  function refreshList(keepId) {
    return api('templates.php').then(function (res) {
      items = res.ok ? res.data.items : [];
      paintList(keepId);
    }, function () {
      items = [];
      paintList();
    });
  }

  // ----- Ações -----

  function changePassword(forced) {
    return UI.form({
      title: forced ? 'Crie a sua senha' : 'Trocar senha',
      text: forced ? 'Você entrou com uma senha provisória. Escolha uma senha só sua para continuar.' : null,
      confirmText: 'Salvar senha',
      fields: [
        { name: 'current', label: forced ? 'Senha provisória' : 'Senha atual', type: 'password', autocomplete: 'current-password' },
        { name: 'fresh', label: 'Nova senha (mínimo de ' + MIN_PASSWORD + ' caracteres)', type: 'password', autocomplete: 'new-password' },
        { name: 'again', label: 'Repita a nova senha', type: 'password', autocomplete: 'new-password' }
      ],
      validate: function (v) {
        if (!v.current) { return 'Informe a senha atual.'; }
        if (v.fresh.length < MIN_PASSWORD) { return 'A nova senha precisa ter pelo menos ' + MIN_PASSWORD + ' caracteres.'; }
        if (v.fresh !== v.again) { return 'As duas senhas novas não são iguais.'; }
        return null;
      }
    }).then(function (values) {
      if (!values) { return false; }
      return call('Salvando a senha…', 'password.php', { current: values.current, 'new': values.fresh }).then(function (res) {
        if (!res) { return changePassword(forced); }
        user = res.data.user;
        UI.toast('success', 'Senha alterada.');
        return true;
      });
    });
  }

  // Depois de entrar: exige a troca da senha provisória antes de liberar os modelos.
  function afterLogin() {
    paint();
    if (user && user.mustChangePassword) {
      return changePassword(true).then(function (changed) {
        if (!changed) { return doLogout(true); }
        return refreshList();
      });
    }
    return Promise.resolve(refreshList());
  }

  function onLogin() {
    UI.form({
      title: 'Entrar',
      text: 'Use o e-mail e a senha cadastrados pelo administrador.',
      confirmText: 'Entrar',
      fields: [
        { name: 'email', label: 'E-mail', type: 'email', autocomplete: 'username', maxLength: 190 },
        { name: 'password', label: 'Senha', type: 'password', autocomplete: 'current-password' }
      ],
      validate: function (v) { return v.email.trim() && v.password ? null : 'Informe o e-mail e a senha.'; }
    }).then(function (values) {
      if (!values) { return; }
      call('Entrando…', 'login.php', { email: values.email.trim(), password: values.password }).then(function (res) {
        if (!res) { return; }
        user = res.data.user;
        csrf = res.data.csrf;
        // Reabre a caixa de modelos, agora com a lista do servidor.
        afterLogin().then(function () {
          if (user) { global.PlannerApp.openGroup('models'); }
        });
      });
    });
  }

  function doLogout(silent) {
    return api('logout.php', {}).then(function (res) {
      if (res.ok) { csrf = res.data.csrf; }
    }, function () {}).then(function () {
      user = null;
      items = [];
      paint();
      if (!silent) { UI.toast('success', 'Você saiu.'); }
    });
  }

  function onLogout() {
    UI.confirm({
      title: 'Sair?',
      text: 'As opções desta tela continuam guardadas neste navegador.',
      confirmText: 'Sair'
    }).then(function (ok) { if (ok) { doLogout(false); } });
  }

  function onLoad() {
    var item = selected();
    if (!item) { return; }
    UI.confirm({
      title: 'Carregar "' + item.name + '"?',
      text: 'As opções atuais desta tela serão substituídas pelas do modelo.',
      note: 'Listas de alunos digitadas aqui serão apagadas (os modelos do servidor não guardam nomes de alunos).',
      confirmText: 'Carregar modelo'
    }).then(function (ok) {
      if (!ok) { return; }
      call('Carregando o modelo…', 'templates.php?id=' + item.id).then(function (res) {
        if (!res) { return; }
        global.PlannerApp.applyConfig(res.data.config);
        UI.toast('success', 'Modelo "' + item.name + '" carregado.');
      });
    });
  }

  function save(item) {
    UI.form({
      title: item ? 'Atualizar "' + item.name + '"' : 'Salvar como novo modelo',
      text: item ? 'O modelo guardado no servidor será substituído pelas opções atuais desta tela.' :
        'As opções atuais desta tela serão guardadas no servidor.',
      note: 'Nomes de alunos não são enviados: no servidor ficam só as turmas e os dias de aula.',
      confirmText: item ? 'Atualizar modelo' : 'Salvar modelo',
      fields: [
        { name: 'name', label: 'Nome do modelo', type: 'text', value: item ? item.name : '', maxLength: 80,
          placeholder: 'Ex.: Planner docente 2027' },
        { name: 'isShared', label: 'Compartilhar com todos os usuários', type: 'checkbox', value: item ? item.isShared : false }
      ],
      validate: function (v) { return v.name.trim() ? null : 'Dê um nome ao modelo.'; }
    }).then(function (values) {
      if (!values) { return; }
      call('Salvando o modelo…', 'templates.php', {
        action: 'save',
        id: item ? item.id : 0,
        name: values.name.trim(),
        isShared: values.isShared,
        config: global.PlannerApp.getConfig()
      }).then(function (res) {
        if (!res) { return; }
        UI.toast('success', res.mensagem);
        refreshList(res.data.id);
      });
    });
  }

  function onDelete() {
    var item = selected();
    if (!item) { return; }
    UI.confirm({
      title: 'Excluir "' + item.name + '"?',
      text: 'O modelo será apagado do servidor' + (item.isShared ? ' para todos os usuários' : '') + '. Esta ação não pode ser desfeita.',
      note: 'As opções que estão nesta tela não são alteradas.',
      confirmText: 'Excluir modelo',
      danger: true
    }).then(function (ok) {
      if (!ok) { return; }
      call('Excluindo…', 'templates.php', { action: 'delete', id: item.id }).then(function (res) {
        if (!res) { return; }
        UI.toast('success', res.mensagem);
        refreshList();
      });
    });
  }

  // ----- Início -----

  if (!section || global.location.protocol === 'file:') { return; }

  buttons.login.addEventListener('click', onLogin);
  buttons.logout.addEventListener('click', onLogout);
  buttons.load.addEventListener('click', onLoad);
  buttons.saveNew.addEventListener('click', function () { save(null); });
  buttons.update.addEventListener('click', function () { var item = selected(); if (item) { save(item); } });
  buttons.remove.addEventListener('click', onDelete);
  buttons.password.addEventListener('click', function () { changePassword(false); });
  select.addEventListener('change', paintButtons);

  api('session.php').then(function (res) {
    section.hidden = false;
    if (!res.ok) {
      // Há PHP, mas o servidor não está configurado (sem .env ou sem banco).
      statusText.textContent = res.mensagem;
      buttons.login.hidden = true;
      return;
    }
    csrf = res.data.csrf;
    user = res.data.user;
    if (!res.data.installed) {
      statusText.textContent = 'O servidor ainda não tem administrador. ';
      var link = document.createElement('a');
      link.href = 'instalar.php';
      link.textContent = 'Concluir a instalação';
      statusText.appendChild(link);
      buttons.login.hidden = true;
      return;
    }
    if (user) { afterLogin(); } else { paint(); }
  }, function () {
    // Hospedagem sem PHP ou sem a pasta api: o gerador segue funcionando sem esta seção.
  });
})(window);
