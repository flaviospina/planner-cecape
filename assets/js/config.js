// assets/js/config.js
// Configuração padrão do planner e persistência no navegador (localStorage).
// Nada é enviado para servidor: o logotipo e as opções ficam apenas no computador do usuário.
(function (global) {
  'use strict';

  var STORAGE_KEY = 'planner_cecape_config_v1';
  var DEFAULT_LOGO = 'assets/img/logo-cecape.jpg';

  var defaults = {
    year: new Date().getFullYear() + 1,

    // Títulos
    title: 'PLANNER',
    subtitle: 'Planejamento mensal e anotações',
    orgName: 'CECAPE',
    city: 'São Caetano do Sul',
    titleAlign: 'left',          // left | center | right
    showNameField: true,
    nameLabel: 'Nome',

    // Logotipo
    logoSrc: DEFAULT_LOGO,       // caminho do arquivo padrão ou data URL enviada pelo usuário
    logoCover: 'top-left',       // top-left | top-center | top-right | bottom-left | bottom-center | bottom-right | none
    logoCoverSize: 'm',          // s | m | l
    logoInner: 'top-right',      // top-right | top-left | footer-center | none
    logoInnerSize: 'm',

    // Calendário
    showYearView: true,
    bordersOnlyDates: false,     // bordas apenas nas células que têm data
    showPriorities: true,
    prioritiesTitle: 'Prioridades do mês',

    // Folhas pautadas entre os meses
    ruledEnabled: true,
    ruledCount: 1,               // quantidade de folhas entre um mês e o seguinte
    ruledTitle: 'Anotações',
    ruledGap: 8                  // espaçamento da pauta em mm
  };

  var limits = {
    year: [1900, 2200],
    ruledCount: [1, 20],
    ruledGap: [5, 12]
  };

  var enums = {
    titleAlign: ['left', 'center', 'right'],
    logoCover: ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right', 'none'],
    logoCoverSize: ['s', 'm', 'l'],
    logoInner: ['top-right', 'top-left', 'footer-center', 'none'],
    logoInnerSize: ['s', 'm', 'l']
  };

  function clampInt(value, range, fallback) {
    var n = parseInt(value, 10);
    if (isNaN(n)) { return fallback; }
    return Math.min(range[1], Math.max(range[0], n));
  }

  // Devolve uma configuração sempre válida, qualquer que seja a entrada.
  function sanitize(raw) {
    var cfg = {};
    raw = raw && typeof raw === 'object' ? raw : {};
    Object.keys(defaults).forEach(function (key) {
      var def = defaults[key];
      var val = raw[key];
      if (typeof def === 'boolean') {
        cfg[key] = typeof val === 'boolean' ? val : def;
      } else if (typeof def === 'number') {
        cfg[key] = clampInt(val, limits[key], def);
      } else if (enums[key]) {
        cfg[key] = enums[key].indexOf(val) >= 0 ? val : def;
      } else {
        cfg[key] = typeof val === 'string' ? val.slice(0, key === 'logoSrc' ? 4000000 : 80) : def;
      }
    });
    // O logotipo só pode ser o arquivo padrão ou uma imagem embutida (data URL).
    if (cfg.logoSrc !== DEFAULT_LOGO && !/^data:image\/(png|jpeg|webp|svg\+xml);base64,/.test(cfg.logoSrc)) {
      cfg.logoSrc = DEFAULT_LOGO;
    }
    return cfg;
  }

  function load() {
    try {
      return sanitize(JSON.parse(global.localStorage.getItem(STORAGE_KEY)));
    } catch (e) {
      return sanitize(null);
    }
  }

  // Retorna false quando o navegador não conseguiu gravar (ex.: armazenamento cheio ou bloqueado).
  function save(cfg) {
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
      return true;
    } catch (e) {
      return false;
    }
  }

  function reset() {
    try { global.localStorage.removeItem(STORAGE_KEY); } catch (e) { /* sem armazenamento: nada a limpar */ }
    return sanitize(null);
  }

  global.PlannerConfig = {
    DEFAULT_LOGO: DEFAULT_LOGO,
    defaults: defaults,
    limits: limits,
    sanitize: sanitize,
    load: load,
    save: save,
    reset: reset
  };
})(window);
