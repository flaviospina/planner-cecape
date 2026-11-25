// assets/js/app.js
// Liga as opções (menu superior + caixas de grupo) à pré-visualização e à impressão.
(function (global) {
  'use strict';

  (global.PlannerBuild = global.PlannerBuild || {}).app = 7;

  var UI = global.PlannerUI;
  var Config = global.PlannerConfig;
  var Pages = global.PlannerPages;
  var I18n = global.PlannerI18n;

  var MAX_LOGO_BYTES = 2 * 1024 * 1024;
  var MAX_MODEL_BYTES = 6 * 1024 * 1024;
  var LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
  var MM = 96 / 25.4; // px CSS por milímetro
  // Textos que acompanham o idioma enquanto a pessoa não os personalizar.
  var LANGUAGE_DEFAULTS = ['subtitle', 'nameLabel', 'prioritiesTitle', 'ruledTitle'];

  var form = document.getElementById('options');
  var settings = document.getElementById('settings');
  var menu = document.getElementById('menu');
  var preview = document.getElementById('preview');
  var pageCount = document.getElementById('page-count');
  var logoThumb = document.getElementById('logo-thumb');
  var logoFile = document.getElementById('logo-file');
  var logoMsg = document.getElementById('logo-msg');
  var saveMsg = document.getElementById('save-msg');
  var modelFile = document.getElementById('model-file');

  // Regra @page: tamanho do papel conforme o formato escolhido.
  var pageRule = document.createElement('style');
  document.head.appendChild(pageRule);

  var cfg = Config.load();
  var renderTimer = null;
  var pagesInOrder = [];   // páginas na ordem de leitura (como aparecem na pré-visualização)
  var imposed = false;     // true enquanto as páginas estão agrupadas em folhas para imprimir

  function showMsg(node, text, ok) {
    if (!node) { return; }
    node.textContent = text || '';
    node.hidden = !text;
    node.classList.toggle('ok', !!ok);
  }

  // ----- Grupos de opções -----

  // Os grupos saem do <form> quando vão para a caixa; o atributo form mantém os campos ligados a ele.
  settings.querySelectorAll('input[name], select[name], textarea[name]').forEach(function (field) {
    field.setAttribute('form', 'options');
  });

  var groups = {};
  settings.querySelectorAll('.group[data-group]').forEach(function (node) {
    groups[node.getAttribute('data-group')] = { node: node, home: node.parentNode, next: node.nextSibling };
  });

  // Devolve todos os grupos ao lugar de origem (a caixa pode ter sido fechada ou trocada por outra).
  function groupsHome() {
    Object.keys(groups).forEach(function (key) {
      var g = groups[key];
      if (g.node.parentNode !== g.home) {
        g.home.insertBefore(g.node, g.next && g.next.parentNode === g.home ? g.next : null);
      }
    });
    document.body.classList.remove('settings-open');
    menu.querySelectorAll('button').forEach(function (b) { b.classList.remove('on'); });
  }

  function openGroup(key) {
    var g = groups[key];
    if (!g) { return; }
    groupsHome();
    var opened = UI.panel(g.node.getAttribute('data-title'), g.node, groupsHome);
    if (!opened) { return; }
    document.body.classList.add('settings-open');
    var button = menu.querySelector('[data-open="' + key + '"]');
    if (button) { button.classList.add('on'); }
    fitPreview();
  }

  // ----- Formulário <-> configuração -----

  function fillForm() {
    Object.keys(Config.defaults).forEach(function (key) {
      var field = form.elements[key];
      if (!field) { return; }
      if (field instanceof RadioNodeList) {
        field.value = cfg[key];
      } else if (field.type === 'checkbox') {
        field.checked = cfg[key];
      } else {
        field.value = cfg[key];
      }
    });
    logoThumb.src = cfg.logoSrc;
    updateDependents();
  }

  function readForm() {
    var raw = { logoSrc: cfg.logoSrc };
    Object.keys(Config.defaults).forEach(function (key) {
      var field = form.elements[key];
      if (!field) { return; }
      if (field instanceof RadioNodeList) {
        raw[key] = field.value;
      } else if (field.type === 'checkbox') {
        raw[key] = field.checked;
      } else if (field.type === 'number' && field.value.trim() === '') {
        raw[key] = cfg[key]; // campo numérico vazio durante a digitação: mantém o valor anterior
      } else {
        raw[key] = field.value;
      }
    });
    cfg = Config.sanitize(raw);
  }

  // Esconde campos que só fazem sentido com a opção-mãe marcada e mostra a dica do formato de papel.
  function updateDependents() {
    document.querySelectorAll('[data-depends]').forEach(function (node) {
      node.classList.toggle('is-off', !cfg[node.getAttribute('data-depends')]);
    });
    var layout = Config.effectiveLayout(cfg);
    document.querySelectorAll('[data-layout-hint]').forEach(function (node) {
      node.hidden = node.getAttribute('data-layout-hint').split(' ').indexOf(layout) < 0;
    });
    document.querySelectorAll('[data-orientation]').forEach(function (node) {
      node.hidden = node.getAttribute('data-orientation') !== cfg.orientation;
    });
  }

  // Ao trocar o idioma, os textos que ainda estão no padrão do idioma anterior passam para o novo.
  function followLanguage(previous) {
    if (previous === cfg.language) { return; }
    var before = I18n.get(previous).defaults;
    var after = I18n.get(cfg.language).defaults;
    LANGUAGE_DEFAULTS.forEach(function (key) {
      if (cfg[key] === before[key]) {
        cfg[key] = after[key];
        form.elements[key].value = after[key];
      }
    });
  }

  // Mostra, abaixo de cada campo de texto livre, as linhas que não puderam ser lidas.
  function showLineErrors(errors) {
    document.querySelectorAll('[data-errors]').forEach(function (node) {
      var bad = errors[node.getAttribute('data-errors')] || [];
      var text = '';
      if (bad.length === 1) {
        text = 'Não entendi a linha ' + bad[0] + '. Ela foi ignorada.';
      } else if (bad.length > 1) {
        text = 'Não entendi as linhas ' + bad.slice(0, 8).join(', ') + (bad.length > 8 ? '…' : '') + '. Elas foram ignoradas.';
      }
      showMsg(node, text);
    });
  }

  // ----- Papel, orientação e montagem -----

  // Plano de impressão: tamanho da folha, páginas por folha e escala das páginas.
  // A página é sempre desenhada em A4 (210 × 297 mm, ou 297 × 210 em paisagem) e ajustada ao papel.
  function printPlan() {
    var land = cfg.orientation === 'landscape';
    var layout = Config.effectiveLayout(cfg);
    var paper = Config.papers[cfg.paperSize];
    var per = layout === 'single' ? 1 : 2;
    var pageW = land ? 297 : 210;
    var pageH = land ? 210 : 297;
    // Paisagem e folhas com duas páginas usam o papel deitado.
    var lying = land || per === 2;
    var sheetW = lying ? paper.h : paper.w;
    var sheetH = lying ? paper.w : paper.h;
    var scale = Math.min(sheetW / per / pageW, sheetH / pageH);
    return {
      layout: layout, paper: paper, per: per, pageW: pageW, lying: lying,
      sheetW: sheetW, sheetH: sheetH, scale: scale,
      // No A4 com uma página por folha, a página já é a folha: nada a montar.
      direct: per === 1 && Math.abs(scale - 1) < 0.001,
      sheets: Math.ceil(pagesInOrder.length / per)
    };
  }

  // Índices das páginas de cada lado de folha.
  function sheetGroups(plan) {
    var total = pagesInOrder.length;
    var groups = [];
    var i;
    if (plan.layout === 'single') {
      for (i = 0; i < total; i++) { groups.push([i]); }
    } else if (plan.layout === 'twoup') {
      // Em sequência: 1|2, 3|4… (para cortar ao meio).
      for (i = 0; i < total; i += 2) { groups.push([i, i + 1]); }
    } else {
      // Livreto: a folha i leva, na frente, a última página livre e a primeira; no verso, as seguintes.
      for (i = 0; i < total / 4; i++) {
        groups.push([total - 1 - 2 * i, 2 * i]);
        groups.push([2 * i + 1, total - 2 - 2 * i]);
      }
    }
    return groups;
  }

  // Monta as folhas só na hora de imprimir; a pré-visualização fica sempre na ordem de leitura.
  function imposeForPrint() {
    var plan = printPlan();
    if (imposed || plan.direct) { return; }
    var frag = document.createDocumentFragment();
    sheetGroups(plan).forEach(function (group) {
      var sheet = document.createElement('div');
      sheet.className = 'sheet';
      sheet.style.width = plan.sheetW + 'mm';
      sheet.style.height = plan.sheetH + 'mm';
      group.forEach(function (index) {
        var half = document.createElement('div');
        half.className = 'half';
        pagesInOrder[index].style.zoom = plan.scale.toFixed(5);
        half.appendChild(pagesInOrder[index]);
        sheet.appendChild(half);
      });
      frag.appendChild(sheet);
    });
    preview.replaceChildren(frag);
    imposed = true;
  }

  function restoreAfterPrint() {
    if (!imposed) { return; }
    var frag = document.createDocumentFragment();
    pagesInOrder.forEach(function (page) {
      page.style.zoom = '';
      frag.appendChild(page);
    });
    preview.replaceChildren(frag);
    imposed = false;
  }

  function paperName(plan) {
    return plan.paper.label + (plan.lying ? ' deitado' : '');
  }

  // ----- Pré-visualização -----

  function fitPreview() {
    // A caixa de opções abre logo abaixo da barra superior, qualquer que seja a altura dela.
    document.documentElement.style.setProperty('--topbar-h', document.querySelector('.topbar').offsetHeight + 'px');
    var pageW = cfg.orientation === 'landscape' ? 297 : 210;
    var available = preview.parentElement.clientWidth - 32;
    var zoom = Math.min(1, Math.max(0.2, available / (pageW * MM)));
    preview.style.zoom = zoom.toFixed(3);
  }

  function render() {
    var result = Pages.build(cfg);
    pagesInOrder = result.pages;
    imposed = false;
    var frag = document.createDocumentFragment();
    pagesInOrder.forEach(function (page) { frag.appendChild(page); });
    preview.replaceChildren(frag);
    var plan = printPlan();
    pageRule.textContent = '@page { size: ' + plan.sheetW + 'mm ' + plan.sheetH + 'mm; margin: 0; }';
    fitPreview();

    var info = pagesInOrder.length + ' páginas';
    if (plan.per === 2) {
      info += ' · ' + (plan.layout === 'booklet' ? plan.sheets / 2 : plan.sheets) + ' folhas ' + plan.paper.label;
    } else if (!plan.direct || cfg.orientation === 'landscape') {
      info += ' · ' + paperName(plan);
    }
    pageCount.textContent = info;
    // O título da aba vira o nome sugerido do arquivo PDF.
    document.title = (cfg.title.trim() || 'Planner') + ' ' + result.yearLabel.replace('/', '-') +
      (cfg.orgName.trim() ? ' ' + cfg.orgName.trim() : '');
    showLineErrors(result.errors);
  }

  function persist() {
    if (Config.save(cfg)) {
      showMsg(saveMsg, '');
    } else {
      showMsg(saveMsg, 'Não foi possível guardar as opções neste navegador. O planner pode ser gerado normalmente, ' +
        'mas as opções não ficarão salvas para a próxima visita.');
    }
  }

  function onChange(event) {
    var field = event.target;
    if (!field || field.form !== form || field === logoFile) { return; }
    var previousLanguage = cfg.language;
    readForm();
    followLanguage(previousLanguage);
    updateDependents();
    persist();
    clearTimeout(renderTimer);
    renderTimer = setTimeout(render, 200);
  }

  // Ao sair de um campo numérico, mostra o valor efetivamente aplicado (dentro dos limites).
  function onBlur(event) {
    var field = event.target;
    if (field && field.form === form && field.type === 'number' && field.name in cfg) {
      field.value = cfg[field.name];
    }
  }

  // ----- Logotipo (as mensagens ficam dentro do próprio grupo, que está aberto em uma caixa) -----

  function onLogoChosen() {
    var file = logoFile.files && logoFile.files[0];
    logoFile.value = '';
    if (!file) { return; }
    if (LOGO_TYPES.indexOf(file.type) < 0) {
      showMsg(logoMsg, 'Formato não aceito. Envie uma imagem PNG, JPG, WebP ou SVG.');
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      showMsg(logoMsg, 'A imagem tem mais de 2 MB. Reduza o arquivo e tente novamente.');
      return;
    }
    var reader = new FileReader();
    reader.onerror = function () {
      showMsg(logoMsg, 'Não foi possível ler o arquivo. Tente novamente.');
    };
    reader.onload = function () {
      var probe = new Image();
      probe.onerror = function () {
        showMsg(logoMsg, 'O arquivo escolhido não é uma imagem válida.');
      };
      probe.onload = function () {
        cfg.logoSrc = reader.result;
        cfg = Config.sanitize(cfg);
        logoThumb.src = cfg.logoSrc;
        showMsg(logoMsg, 'Logotipo trocado.', true);
        persist();
        render();
      };
      probe.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function onLogoReset() {
    cfg.logoSrc = Config.DEFAULT_LOGO;
    logoThumb.src = cfg.logoSrc;
    showMsg(logoMsg, 'Logotipo padrão restaurado.', true);
    persist();
    render();
  }

  // ----- Exportar e importar modelo -----

  function hasStudentNames() {
    return cfg.classes.split(/\r?\n/).some(function (line) {
      return line.trim() !== '' && !/^\s*turma\s*:/i.test(line);
    });
  }

  function onExport() {
    readForm();
    UI.confirm({
      title: 'Exportar modelo',
      text: 'Será baixado um arquivo com todas as opções do planner (inclusive o logotipo). ' +
        'Guarde-o para reaproveitar no ano seguinte ou envie a um colega, que poderá abri-lo em "Importar modelo".',
      note: hasStudentNames() ? 'Atenção: o arquivo leva junto os nomes dos alunos digitados nas turmas.' : null,
      icon: 'info',
      confirmText: 'Baixar arquivo'
    }).then(function (ok) {
      if (!ok) { return; }
      var name = 'modelo-planner-' + cfg.year + '.json';
      var data = JSON.stringify({ app: 'planner-cecape', version: 1, config: cfg }, null, 2);
      var url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
      var a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      UI.notify('success', 'Modelo exportado', 'O arquivo "' + name + '" está na pasta de downloads.');
    });
  }

  function onImport() {
    var file = modelFile.files && modelFile.files[0];
    modelFile.value = '';
    if (!file) { return; }
    if (file.size > MAX_MODEL_BYTES) {
      UI.notify('error', 'Arquivo grande demais', 'Este arquivo é grande demais para ser um modelo deste gerador.');
      return;
    }
    var reader = new FileReader();
    reader.onerror = function () {
      UI.notify('error', 'Não foi possível ler o arquivo', 'Tente novamente.');
    };
    reader.onload = function () {
      var data;
      try {
        data = JSON.parse(reader.result);
      } catch (e) {
        data = null;
      }
      if (!data || data.app !== 'planner-cecape' || !data.config || typeof data.config !== 'object') {
        UI.notify('error', 'Arquivo não reconhecido', 'Este arquivo não é um modelo exportado por este gerador.');
        return;
      }
      UI.confirm({
        title: 'Importar modelo?',
        text: 'As opções atuais do planner serão substituídas pelas do arquivo "' + file.name + '".',
        confirmText: 'Importar'
      }).then(function (ok) {
        if (!ok) { return; }
        applyConfig(data.config);
        UI.toast('success', 'Modelo importado.');
      });
    };
    reader.readAsText(file);
  }

  // Substitui todas as opções (modelo importado ou vindo do servidor). sanitize() descarta valores inválidos.
  function applyConfig(raw) {
    cfg = Config.sanitize(raw);
    fillForm();
    persist();
    render();
  }

  // ----- Ações -----

  function onReset() {
    UI.confirm({
      title: 'Restaurar o modelo original?',
      text: 'Todas as opções voltam ao padrão do planner CECAPE.',
      note: 'As listas digitadas (datas, períodos, turmas e alunos) e o logotipo enviado serão apagados deste navegador.',
      confirmText: 'Restaurar',
      danger: true
    }).then(function (ok) {
      if (!ok) { return; }
      cfg = Config.reset();
      fillForm();
      showMsg(saveMsg, '');
      showMsg(logoMsg, '');
      render();
      UI.toast('success', 'Modelo original restaurado.');
    });
  }

  function onPrint() {
    clearTimeout(renderTimer);
    try {
      readForm();
      render();
    } catch (error) {
      // Mesmo que a atualização falhe, a impressão do que está na tela continua disponível.
      if (global.console) { global.console.error(error); }
    }
    var plan = printPlan();
    var summary = 'Seu planner tem ' + pagesInOrder.length + ' páginas';
    var items = ['Destino: Salvar como PDF (ou a impressora)'];

    if (plan.layout === 'twoup') {
      summary += ', duas por folha: ' + plan.sheets + ' folhas (ou ' + Math.ceil(plan.sheets / 2) + ' em frente e verso)';
    } else if (plan.layout === 'booklet') {
      summary += ' em livreto: ' + (plan.sheets / 2) + ' folhas impressas dos dois lados';
    }
    items.push('Papel: ' + plan.paper.label + (plan.lying ? ' (a orientação deitada é definida automaticamente)' : ''));
    if (plan.layout === 'booklet') { items.push('Frente e verso: virar na borda curta'); }
    items.push('Margens: Nenhuma');
    items.push('Gráficos de plano de fundo: ativado');
    if (plan.layout === 'single' && cfg.duplex) {
      items.push('Frente e verso: virar na borda ' + (plan.lying ? 'curta' : 'longa'));
    }
    var note = plan.layout === 'booklet' ? 'As páginas saem reorganizadas para a dobra. Depois de imprimir, dobre o maço ao meio e grampeie.' :
      (plan.layout === 'twoup' ? 'Depois de imprimir, corte as folhas ao meio.' :
        (cfg.paperSize !== 'a4' ? 'Ao imprimir em papel, selecione ' + plan.paper.label + ' também nas opções da impressora.' : null));

    UI.confirm({
      title: 'Imprimir ou salvar em PDF',
      text: summary + '. Na janela que vai abrir, confira:',
      items: items,
      note: note,
      icon: 'info',
      confirmText: 'Abrir impressão'
    }).then(function (ok) {
      // Aguarda a caixa fechar por completo antes de abrir a janela de impressão.
      if (ok) { setTimeout(function () { global.print(); }, 350); }
    });
  }

  document.addEventListener('input', onChange);
  document.addEventListener('change', onChange);
  document.addEventListener('focusout', onBlur);
  form.addEventListener('submit', function (event) { event.preventDefault(); });
  menu.addEventListener('click', function (event) {
    var button = event.target.closest('[data-open]');
    if (!button) { return; }
    // Clicar no grupo que já está aberto fecha a caixa.
    if (button.classList.contains('on') && UI.isPanelOpen()) {
      global.Swal.close();
    } else {
      openGroup(button.getAttribute('data-open'));
    }
  });
  logoFile.addEventListener('change', onLogoChosen);
  modelFile.addEventListener('change', onImport);
  document.getElementById('logo-reset').addEventListener('click', onLogoReset);
  document.getElementById('btn-export').addEventListener('click', onExport);
  document.getElementById('btn-reset').addEventListener('click', onReset);
  document.getElementById('btn-print').addEventListener('click', onPrint);
  // Sair: confirma antes de encerrar a sessão.
  var logoutForm = document.getElementById('logout-form');
  if (logoutForm) {
    logoutForm.addEventListener('submit', function (event) {
      if (logoutForm.dataset.confirmed === '1') { return; }
      event.preventDefault();
      UI.confirm({
        title: 'Sair do planner?',
        text: 'As opções desta tela continuam guardadas neste navegador.',
        confirmText: 'Sair'
      }).then(function (ok) {
        if (ok) {
          logoutForm.dataset.confirmed = '1';
          logoutForm.submit();
        }
      });
    });
  }
  global.addEventListener('resize', fitPreview);
  // Vale também para Ctrl+P: as folhas A5 são montadas ao imprimir e desfeitas em seguida.
  global.addEventListener('beforeprint', imposeForPrint);
  global.addEventListener('afterprint', restoreAfterPrint);

  // Usado pelo módulo de modelos no servidor (server.js).
  global.PlannerApp = {
    getConfig: function () { readForm(); return cfg; },
    applyConfig: applyConfig,
    openGroup: openGroup
  };

  fillForm();
  render();
})(window);
