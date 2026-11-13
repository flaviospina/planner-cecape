// assets/js/pages.js
// Monta as páginas do planner (elementos DOM) a partir da configuração.
// Cada tipo de página é uma função; build() define a ordem e numera as páginas.
(function (global) {
  'use strict';

  var MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  // Semana iniciando na segunda-feira, como no modelo.
  var WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  var WEEKDAYS_MINI = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

  var COVER_LOGO_W = { s: '55mm', m: '75mm', l: '95mm' };
  var INNER_LOGO_W = { s: '30mm', m: '39mm', l: '48mm' };

  // Área útil da folha pautada (do início da pauta até antes do rodapé), em mm.
  var RULED_HEIGHT = 210;

  // Cria elemento. O texto entra sempre por textContent (nunca innerHTML).
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) { node.className = className; }
    if (text !== undefined && text !== null) { node.textContent = text; }
    return node;
  }

  function bar() {
    var b = el('div', 'bar');
    for (var i = 0; i < 4; i++) { b.appendChild(el('i')); }
    return b;
  }

  function logoImg(cfg) {
    var img = el('img');
    img.src = cfg.logoSrc;
    img.alt = cfg.orgName || 'Logotipo';
    return img;
  }

  function quarterClass(month) {
    return 'q' + (Math.floor(month / 3) + 1);
  }

  // Semanas do mês: matriz de 7 colunas (seg..dom) com o dia ou null.
  function monthWeeks(year, month) {
    var first = new Date(year, month, 1);
    var total = new Date(year, month + 1, 0).getDate();
    var offset = (first.getDay() + 6) % 7; // 0 = segunda
    var cells = [];
    var i;
    for (i = 0; i < offset; i++) { cells.push(null); }
    for (i = 1; i <= total; i++) { cells.push(i); }
    while (cells.length % 7 !== 0) { cells.push(null); }
    var weeks = [];
    for (i = 0; i < cells.length; i += 7) { weeks.push(cells.slice(i, i + 7)); }
    return weeks;
  }

  function footerLabel(cfg) {
    var parts = [];
    if (cfg.orgName.trim()) { parts.push(cfg.orgName.trim()); }
    parts.push((cfg.title.trim() ? cfg.title.trim() + ' ' : '') + cfg.year);
    return parts.join('  /  ');
  }

  // Página interna: cabeçalho (faixa, sobretítulo, título), logotipo e rodapé.
  function innerPage(cfg, opts) {
    var page = el('section', 'page inner ' + (opts.quarter || 'q1'));
    var mirror = cfg.logoInner === 'top-left';

    var head = el('div', 'head' + (mirror ? ' mirror' : ''));
    head.appendChild(bar());
    head.appendChild(el('div', 'eyebrow', opts.eyebrow));
    head.appendChild(el('h2', 'title', opts.title));
    page.appendChild(head);

    if (cfg.logoInner !== 'none') {
      var logo = el('div', 'inner-logo ' + cfg.logoInner);
      logo.style.setProperty('--logo-w', INNER_LOGO_W[cfg.logoInnerSize]);
      logo.appendChild(logoImg(cfg));
      page.appendChild(logo);
    }

    var foot = el('div', 'foot');
    foot.appendChild(el('span', '', footerLabel(cfg)));
    foot.appendChild(el('span', 'page-number'));
    page.appendChild(foot);
    return page;
  }

  function coverPage(cfg) {
    var pos = cfg.logoCover;
    var vertical = pos === 'none' ? 'none' : pos.split('-')[0];
    var page = el('section', 'page cover logo-' + vertical + ' align-' + cfg.titleAlign +
      (cfg.showNameField ? '' : ' no-name'));

    if (pos !== 'none') {
      var logo = el('div', 'cover-logo v-' + vertical + ' h-' + pos.split('-')[1]);
      logo.style.setProperty('--logo-w', COVER_LOGO_W[cfg.logoCoverSize]);
      logo.appendChild(logoImg(cfg));
      page.appendChild(logo);
    }

    var body = el('div', 'cover-body');
    body.appendChild(bar());
    if (cfg.title.trim()) { body.appendChild(el('h1', 'cover-title', cfg.title.trim())); }
    body.appendChild(el('div', 'cover-year', String(cfg.year)));
    if (cfg.subtitle.trim()) { body.appendChild(el('p', 'cover-subtitle', cfg.subtitle.trim())); }

    if (cfg.showNameField) {
      var name = el('div', 'cover-name');
      name.appendChild(el('span', '', cfg.nameLabel.trim() || 'Nome'));
      name.appendChild(el('i'));
      body.appendChild(name);
    }

    var blocks = el('div', 'cover-blocks');
    for (var i = 0; i < 4; i++) { blocks.appendChild(el('i')); }
    body.appendChild(blocks);

    if (cfg.city.trim()) { body.appendChild(el('div', 'cover-city', cfg.city.trim())); }
    page.appendChild(body);
    return page;
  }

  function yearPage(cfg) {
    var page = innerPage(cfg, {
      eyebrow: (cfg.title.trim() ? cfg.title.trim() + ' ' : '') + cfg.year,
      title: 'Visão anual'
    });
    var grid = el('div', 'year-grid');
    for (var m = 0; m < 12; m++) {
      var mini = el('div', 'mini ' + quarterClass(m));
      mini.appendChild(el('div', 'mini-name', MONTHS[m]));
      var mg = el('div', 'mini-grid');
      WEEKDAYS_MINI.forEach(function (letter) { mg.appendChild(el('b', '', letter)); });
      monthWeeks(cfg.year, m).forEach(function (week) {
        week.forEach(function (day, col) {
          mg.appendChild(el('span', col >= 5 ? 'we' : '', day === null ? '' : String(day)));
        });
      });
      mini.appendChild(mg);
      grid.appendChild(mini);
    }
    page.appendChild(grid);
    return page;
  }

  function monthPage(cfg, month) {
    var page = innerPage(cfg, {
      quarter: quarterClass(month),
      eyebrow: 'Calendário mensal  /  ' + cfg.year,
      title: MONTHS[month]
    });

    var grid = el('div', 'month-grid' + (cfg.bordersOnlyDates ? ' only-dates' : ''));
    WEEKDAYS.forEach(function (name) { grid.appendChild(el('div', 'wd', name)); });
    monthWeeks(cfg.year, month).forEach(function (week) {
      week.forEach(function (day, col) {
        var cls = 'day' + (col >= 5 ? ' we' : '') + (day === null ? ' empty' : '');
        grid.appendChild(el('div', cls, day === null ? '' : String(day)));
      });
    });
    page.appendChild(grid);

    if (cfg.showPriorities) {
      var pri = el('div', 'priorities');
      pri.appendChild(el('h3', '', cfg.prioritiesTitle.trim() || 'Prioridades do mês'));
      for (var i = 0; i < 3; i++) {
        var item = el('div', 'item');
        item.appendChild(el('b'));
        item.appendChild(el('i'));
        pri.appendChild(item);
      }
      page.appendChild(pri);
    }
    return page;
  }

  function ruledPage(cfg, month) {
    var page = innerPage(cfg, {
      quarter: quarterClass(month),
      eyebrow: MONTHS[month] + '  /  ' + cfg.year,
      title: cfg.ruledTitle.trim() || 'Anotações'
    });
    var ruled = el('div', 'ruled');
    ruled.style.setProperty('--rule-gap', cfg.ruledGap + 'mm');
    var lines = Math.floor(RULED_HEIGHT / cfg.ruledGap);
    for (var i = 0; i < lines; i++) { ruled.appendChild(el('i')); }
    page.appendChild(ruled);
    return page;
  }

  // Devolve a lista de páginas na ordem de impressão, já numeradas.
  function build(cfg) {
    var pages = [coverPage(cfg)];
    if (cfg.showYearView) { pages.push(yearPage(cfg)); }
    for (var m = 0; m < 12; m++) {
      pages.push(monthPage(cfg, m));
      // As folhas pautadas ficam ENTRE os meses: não há folhas depois de dezembro (como no modelo).
      if (cfg.ruledEnabled && m < 11) {
        for (var n = 0; n < cfg.ruledCount; n++) { pages.push(ruledPage(cfg, m)); }
      }
    }
    pages.forEach(function (page, index) {
      var num = page.querySelector('.page-number');
      if (num) { num.textContent = String(index + 1).padStart(2, '0'); }
    });
    return pages;
  }

  global.PlannerPages = { build: build, monthWeeks: monthWeeks, MONTHS: MONTHS };
})(window);
