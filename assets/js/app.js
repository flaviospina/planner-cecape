// assets/js/app.js
// Liga o formulário de opções à pré-visualização e à impressão.
(function (global) {
  'use strict';

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
  var logoMsg = document.getElementById('logo-msg');
  var saveMsg = document.getElementById('save-msg');
  var modelFile = document.getElementById('model-file');
  var modelMsg = document.getElementById('model-msg');

  // Regra @page: A4 em pé ou, no livreto, deitado.
  var pageRule = document.createElement('style');
  document.head.appendChild(pageRule);

  var cfg = Config.load();
  var renderTimer = null;

  function showMsg(node, text, ok) {
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
    var nodes = cfg.booklet ? imposeBooklet(result.pages) : result.pages;
    var frag = document.createDocumentFragment();
    nodes.forEach(function (node) { frag.appendChild(node); });
    preview.replaceChildren(frag);
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
        showMsg(logoMsg, 'O arquivo não é uma imagem válida.');
      };
      probe.onload = function () {
        cfg.logoSrc = reader.result;
        cfg = Config.sanitize(cfg);
        logoThumb.src = cfg.logoSrc;
        showMsg(logoMsg, '');
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
    showMsg(logoMsg, '');
    persist();
    render();
  }

  // ----- Exportar e importar modelo -----

  function onExport() {
    readForm();
    var data = JSON.stringify({ app: 'planner-cecape', version: 1, config: cfg }, null, 2);
    var url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    var a = document.createElement('a');
    a.href = url;
    a.download = 'modelo-planner-' + cfg.year + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    showMsg(modelMsg, 'Modelo exportado. Procure o arquivo na pasta de downloads.', true);
  }

  function onImport() {
    var file = modelFile.files && modelFile.files[0];
    modelFile.value = '';
    if (!file) { return; }
    if (file.size > MAX_MODEL_BYTES) {
      showMsg(modelMsg, 'O arquivo é grande demais para ser um modelo deste gerador.');
      return;
    }
    var reader = new FileReader();
    reader.onerror = function () {
      showMsg(modelMsg, 'Não foi possível ler o arquivo. Tente novamente.');
    };
    reader.onload = function () {
      var data;
      try {
        data = JSON.parse(reader.result);
      } catch (e) {
        data = null;
      }
      if (!data || data.app !== 'planner-cecape' || !data.config || typeof data.config !== 'object') {
        showMsg(modelMsg, 'Este arquivo não é um modelo exportado por este gerador.');
        return;
      }
      // sanitize() descarta qualquer valor fora do esperado.
      cfg = Config.sanitize(data.config);
      fillForm();
      persist();
      render();
      showMsg(modelMsg, 'Modelo importado.', true);
    };
    reader.readAsText(file);
  }

  // ----- Ações -----

  function onReset() {
    if (!global.confirm('Restaurar todas as opções para o modelo original? As listas digitadas (datas, turmas) serão apagadas.')) {
      return;
    }
    cfg = Config.reset();
    fillForm();
    showMsg(logoMsg, '');
    showMsg(saveMsg, '');
    showMsg(modelMsg, '');
    render();
  }

  function onPrint() {
    clearTimeout(renderTimer);
    readForm();
    render();
    global.print();
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

  fillForm();
  render();
})(window);
