// assets/js/app.js
// Liga o formulário de opções à pré-visualização e à impressão.
(function (global) {
  'use strict';

  (global.PlannerBuild = global.PlannerBuild || {}).app = 4;

  var UI = global.PlannerUI;
  var Config = global.PlannerConfig;
  var Pages = global.PlannerPages;

  var MAX_LOGO_BYTES = 2 * 1024 * 1024;
  var MAX_MODEL_BYTES = 6 * 1024 * 1024;
  var LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
  var MM = 96 / 25.4; // px CSS por milímetro

  var form = document.getElementById('options');
  var preview = document.getElementById('preview');
  var pageCount = document.getElementById('page-count');
  var logoThumb = document.getElementById('logo-thumb');
  var logoFile = document.getElementById('logo-file');
  var saveMsg = document.getElementById('save-msg');
  var modelFile = document.getElementById('model-file');

  // Regra @page: A4 em pé ou, no livreto, deitado.
  var pageRule = document.createElement('style');
  document.head.appendChild(pageRule);

  var cfg = Config.load();
  var renderTimer = null;
  var lastResult = { pages: 0, sheets: 0 };

  function showMsg(node, text, ok) {
    if (!node) { return; }
    node.textContent = text || '';
    node.hidden = !text;
    node.classList.toggle('ok', !!ok);
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

  // Esconde campos que só fazem sentido com a opção-mãe marcada.
  function updateDependents() {
    form.querySelectorAll('[data-depends]').forEach(function (node) {
      node.classList.toggle('is-off', !cfg[node.getAttribute('data-depends')]);
    });
  }

  // Mostra, abaixo de cada campo de texto livre, as linhas que não puderam ser lidas.
  function showLineErrors(errors) {
    form.querySelectorAll('[data-errors]').forEach(function (node) {
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

  // ----- Livreto: duas páginas A5 por folha A4, na ordem de dobra -----

  function blankPage() {
    var page = document.createElement('section');
    page.className = 'page blank';
    return page;
  }

  // Cada folha recebe [esquerda, direita]. Para N páginas (múltiplo de 4), a folha i tem
  // na frente N-2i e 2i+1 e, no verso, 2i+2 e N-2i-1.
  function imposeBooklet(pages) {
    pages = pages.slice();
    while (pages.length % 4 !== 0) { pages.push(blankPage()); }
    var total = pages.length;
    var sheets = [];
    function sheet(left, right) {
      var node = document.createElement('div');
      node.className = 'sheet';
      node.appendChild(pages[left]);
      node.appendChild(pages[right]);
      sheets.push(node);
    }
    for (var i = 0; i < total / 4; i++) {
      sheet(total - 1 - 2 * i, 2 * i);
      sheet(2 * i + 1, total - 2 - 2 * i);
    }
    return sheets;
  }

  // ----- Pré-visualização -----

  function fitPreview() {
    var width = (cfg.booklet ? 297 : 210) * MM;
    var available = preview.parentElement.clientWidth - 32;
    var zoom = Math.min(1, Math.max(0.2, available / width));
    preview.style.zoom = zoom.toFixed(3);
  }

  function render() {
    var result = Pages.build(cfg);
    lastResult = { pages: result.pages.length, sheets: 0 };
    var nodes = cfg.booklet ? imposeBooklet(result.pages) : result.pages;
    var frag = document.createDocumentFragment();
    nodes.forEach(function (node) { frag.appendChild(node); });
    preview.replaceChildren(frag);
    if (cfg.booklet) { lastResult.sheets = nodes.length / 2; }
    pageRule.textContent = '@page { size: A4 ' + (cfg.booklet ? 'landscape' : 'portrait') + '; margin: 0; }';
    fitPreview();

    pageCount.textContent = result.pages.length + ' páginas' +
      (cfg.booklet ? ' em ' + (nodes.length / 2) + ' folhas A4' : '');
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
    if (event.target === logoFile || event.target === modelFile) { return; }
    readForm();
    updateDependents();
    persist();
    clearTimeout(renderTimer);
    renderTimer = setTimeout(render, 200);
  }

  // Ao sair de um campo numérico, mostra o valor efetivamente aplicado (dentro dos limites).
  function onBlur(event) {
    var field = event.target;
    if (field.type === 'number' && field.name in cfg) {
      field.value = cfg[field.name];
    }
  }

  // ----- Logotipo -----

  function onLogoChosen() {
    var file = logoFile.files && logoFile.files[0];
    logoFile.value = '';
    if (!file) { return; }
    if (LOGO_TYPES.indexOf(file.type) < 0) {
      UI.notify('error', 'Formato não aceito', 'Envie uma imagem PNG, JPG, WebP ou SVG.');
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      UI.notify('error', 'Imagem grande demais', 'A imagem tem mais de 2 MB. Reduza o arquivo e tente novamente.');
      return;
    }
    var reader = new FileReader();
    reader.onerror = function () {
      UI.notify('error', 'Não foi possível ler o arquivo', 'Tente novamente.');
    };
    reader.onload = function () {
      var probe = new Image();
      probe.onerror = function () {
        UI.notify('error', 'Arquivo inválido', 'O arquivo escolhido não é uma imagem válida.');
      };
      probe.onload = function () {
        cfg.logoSrc = reader.result;
        cfg = Config.sanitize(cfg);
        logoThumb.src = cfg.logoSrc;
        persist();
        render();
        UI.toast('success', 'Logotipo trocado.');
      };
      probe.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function onLogoReset() {
    cfg.logoSrc = Config.DEFAULT_LOGO;
    logoThumb.src = cfg.logoSrc;
    persist();
    render();
    UI.toast('success', 'Logotipo padrão restaurado.');
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
      text: 'Será baixado um arquivo com todas as opções desta tela (inclusive o logotipo). ' +
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
        text: 'As opções atuais desta tela serão substituídas pelas do arquivo "' + file.name + '".',
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
    var items = [
      'Destino: Salvar como PDF (ou a impressora)',
      'Papel: A4',
      'Margens: Nenhuma',
      'Gráficos de plano de fundo: ativado'
    ];
    if (cfg.booklet) {
      items.push('Frente e verso: virar na borda curta');
    } else if (cfg.duplex) {
      items.push('Frente e verso: virar na borda longa');
    }
    UI.confirm({
      title: 'Imprimir ou salvar em PDF',
      text: 'Seu planner tem ' + lastResult.pages + ' páginas' +
        (lastResult.sheets ? ', em ' + lastResult.sheets + ' folhas A4 (livreto A5)' : '') +
        '. Na janela que vai abrir, confira:',
      items: items,
      icon: 'info',
      confirmText: 'Abrir impressão'
    }).then(function (ok) {
      // Aguarda a caixa fechar por completo antes de abrir a janela de impressão.
      if (ok) { setTimeout(function () { global.print(); }, 350); }
    });
  }

  form.addEventListener('input', onChange);
  form.addEventListener('change', onChange);
  form.addEventListener('focusout', onBlur);
  form.addEventListener('submit', function (event) { event.preventDefault(); });
  logoFile.addEventListener('change', onLogoChosen);
  modelFile.addEventListener('change', onImport);
  document.getElementById('logo-reset').addEventListener('click', onLogoReset);
  document.getElementById('btn-export').addEventListener('click', onExport);
  document.getElementById('btn-reset').addEventListener('click', onReset);
  document.getElementById('btn-print').addEventListener('click', onPrint);
  global.addEventListener('resize', fitPreview);

  // Usado pelo módulo de modelos no servidor (server.js).
  global.PlannerApp = {
    getConfig: function () { readForm(); return cfg; },
    applyConfig: applyConfig
  };

  fillForm();
  render();
})(window);
