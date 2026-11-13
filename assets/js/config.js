// assets/js/config.js
// Configuração padrão do planner e persistência no navegador (localStorage).
// Nada é enviado para servidor: o logotipo e as opções ficam apenas no computador do usuário.
(function (global) {
  'use strict';

  (global.PlannerBuild = global.PlannerBuild || {}).config = 5;

  var STORAGE_KEY = 'planner_cecape_config_v1';
  var DEFAULT_LOGO = 'assets/img/logo-cecape.jpg';

  var defaults = {
    language: 'pt-BR',           // idioma do planner: pt-BR | en-US | es | it | fr

    // Período
    year: new Date().getFullYear() + 1, // ano do primeiro mês
    startMonth: 1,               // mês inicial (1 a 12) — permite ano letivo
    monthCount: 12,              // duração em meses (1 a 18)
    weekStart: 'mon',            // mon | sun

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
    showWeekNumbers: false,      // número da semana (ISO) ao lado de cada linha
    showHolidays: false,         // feriados nacionais
    showOptionalHolidays: false, // pontos facultativos (Carnaval, Cinzas, Corpus Christi)
    showStateHoliday: false,     // feriado estadual de SP (9 de julho)
    showMunicipalHolidays: false,
    municipalHolidays: '28/07 Aniversário de São Caetano do Sul', // editável; mesmo formato das datas próprias
    showMoon: false,             // fases da lua
    customDates: '',             // datas próprias, uma por linha: "DD/MM Texto" ou "DD/MM/AAAA Texto"
    showPriorities: true,
    prioritiesTitle: 'Prioridades do mês',

    // Calendário letivo
    schoolPeriods: '',           // "DD/MM/AAAA a DD/MM/AAAA 1º bimestre", um por linha
    schoolBreaks: '',            // "DD/MM/AAAA a DD/MM/AAAA Recesso", um por linha
    recurringEvents: '',         // "seg HTPC", "1ª qua Conselho", "última sex Reunião de pais"
    showSchoolSummary: false,    // página de resumo do calendário letivo
    showMeetings: false,         // página de pauta/ata para cada reunião encontrada
    meetingKeyword: 'HTPC',      // texto que identifica as reuniões entre as datas e os eventos recorrentes
    showAttendance: false,       // lista de chamada por turma e por mês
    classes: '',                 // "Turma: 5º A | seg, qua" + nomes dos alunos, um por linha

    // Páginas extras
    showGoals: false,            // metas do período (após a visão anual)
    showHabits: false,           // tracker de hábitos (uma página por mês)
    showWeekly: false,           // páginas semanais
    weeklyLayout: 'rows',        // rows (dias em linhas) | columns (colunas com horários) | lesson (plano de aula com BNCC)
    showReview: false,           // revisão do mês

    // Folhas de anotações entre os meses
    ruledEnabled: true,
    ruledCount: 1,               // quantidade de folhas entre um mês e o seguinte
    ruledStyle: 'lines',         // lines | dots | grid | cornell | blank
    ruledTitle: 'Anotações',
    ruledGap: 8,                 // espaçamento da pauta em mm

    // Impressão e acessibilidade
    bindingMargin: 0,            // margem extra de encadernação, em mm
    duplex: false,               // frente e verso: a margem de encadernação alterna de lado
    paper: 'a4',                 // a4 | a5 (uma página por folha A5) | a5x2 (duas por folha A4, em sequência) | booklet (livreto)
    inkSaver: false,             // economia de tinta: sem fundos preenchidos
    largeText: false,            // fonte ampliada
    highContrast: false,         // alto contraste
    showLinks: false             // abas e links de navegação entre as páginas (uso em tablet)
  };

  var limits = {
    year: [1900, 2200],
    startMonth: [1, 12],
    monthCount: [1, 18],
    ruledCount: [1, 20],
    ruledGap: [5, 12],
    bindingMargin: [0, 15]
  };

  var enums = {
    language: ['pt-BR', 'en-US', 'es', 'it', 'fr'],
    paper: ['a4', 'a5', 'a5x2', 'booklet'],
    weekStart: ['mon', 'sun'],
    titleAlign: ['left', 'center', 'right'],
    logoCover: ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right', 'none'],
    logoCoverSize: ['s', 'm', 'l'],
    logoInner: ['top-right', 'top-left', 'footer-center', 'none'],
    logoInnerSize: ['s', 'm', 'l'],
    weeklyLayout: ['rows', 'columns', 'lesson'],
    ruledStyle: ['lines', 'dots', 'grid', 'cornell', 'blank']
  };

  // Tamanho máximo dos textos (o padrão é 80 caracteres).
  var maxLength = {
    logoSrc: 4000000, customDates: 6000, municipalHolidays: 2000,
    schoolPeriods: 2000, schoolBreaks: 2000, recurringEvents: 2000, classes: 30000
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
    // Modelos de versões anteriores guardavam o livreto como opção sim/não.
    if (raw.booklet === true && raw.paper === undefined) { raw.paper = 'booklet'; }
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
        cfg[key] = typeof val === 'string' ? val.slice(0, maxLength[key] || 80) : def;
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
