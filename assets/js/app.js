// assets/js/app.js
// Liga o formulário de opções à pré-visualização e à impressão.
(function (global) {
  'use strict';

  var Config = global.PlannerConfig;
  var Pages = global.PlannerPages;

  var MAX_LOGO_BYTES = 2 * 1024 * 1024;
  var LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
  var PAGE_WIDTH_PX = 210 * 96 / 25.4; // largura do A4 em px CSS

  var form = document.getElementById('options');
  var preview = document.getElementById('preview');
  var pageCount = document.getElementById('page-count');
  var logoThumb = document.getElementById('logo-thumb');
  var logoFile = document.getElementById('logo-file');
  var logoMsg = document.getElementById('logo-msg');
  var saveMsg = document.getElementById('save-msg');

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

  // ----- Pré-visualização -----

  function fitPreview() {
    var available = preview.parentElement.clientWidth - 32;
    var zoom = Math.min(1, Math.max(0.2, available / PAGE_WIDTH_PX));
    preview.style.zoom = zoom.toFixed(3);
  }

  function render() {
    var pages = Pages.build(cfg);
    var frag = document.createDocumentFragment();
    pages.forEach(function (page) { frag.appendChild(page); });
    preview.replaceChildren(frag);
    pageCount.textContent = pages.length + ' páginas';
    document.title = (cfg.title.trim() || 'Planner') + ' ' + cfg.year +
      (cfg.orgName.trim() ? ' ' + cfg.orgName.trim() : '');
  }

  function persist() {
    if (Config.save(cfg)) {
      showMsg(saveMsg, '');
    } else {
      showMsg(saveMsg, 'Não foi possível guardar as opções neste navegador. O planner pode ser gerado normalmente, ' +
        'mas as opções não ficarão salvas para a próxima visita.');
    }
  }

  function onChange() {
    readForm();
    updateDependents();
    persist();
    clearTimeout(renderTimer);
    renderTimer = setTimeout(render, 120);
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

  // ----- Ações -----

  function onReset() {
    if (!global.confirm('Restaurar todas as opções para o modelo original?')) { return; }
    cfg = Config.reset();
    fillForm();
    showMsg(logoMsg, '');
    showMsg(saveMsg, '');
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
  document.getElementById('logo-reset').addEventListener('click', onLogoReset);
  document.getElementById('btn-reset').addEventListener('click', onReset);
  document.getElementById('btn-print').addEventListener('click', onPrint);
  global.addEventListener('resize', fitPreview);

  fillForm();
  fitPreview();
  render();
})(window);
