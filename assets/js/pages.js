// assets/js/pages.js
// Monta as páginas do planner (elementos DOM) a partir da configuração.
// Cada tipo de página é uma função; build() define a ordem e numera as páginas.
(function (global) {
  'use strict';

  var Cal = global.PlannerCalendar;

  var MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  var MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  // Índice = dia da semana do JavaScript (0 = domingo).
  var DOW_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  var DOW_LONG = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  var DOW_LETTER = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  var MOON_LABEL = { 'new': 'Lua nova', first: 'Quarto crescente', full: 'Lua cheia', last: 'Quarto minguante' };

  var COVER_LOGO_W = { s: '55mm', m: '75mm', l: '95mm' };
  var INNER_LOGO_W = { s: '30mm', m: '39mm', l: '48mm' };

  var CONTENT_WIDTH = 174;  // largura útil da página, em mm
  var RULED_HEIGHT = 210;   // altura útil da folha de anotações, em mm
  var SVG_NS = 'http://www.w3.org/2000/svg';

  // ----- Utilitários de DOM -----

  // Cria elemento. O texto entra sempre por textContent (nunca innerHTML).
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) { node.className = className; }
    if (text !== undefined && text !== null) { node.textContent = text; }
    return node;
  }

  function svg(tag, attrs) {
    var node = document.createElementNS(SVG_NS, tag);
    Object.keys(attrs || {}).forEach(function (name) { node.setAttribute(name, attrs[name]); });
    return node;
  }

  function repeat(parent, count, factory) {
    for (var i = 0; i < count; i++) { parent.appendChild(factory(i)); }
    return parent;
  }

  function bar() {
    return repeat(el('div', 'bar'), 4, function () { return el('i'); });
  }

  // Bloco de linhas para escrever.
  function writeLines(count, gap) {
    var box = el('div', 'lines');
    if (gap) { box.style.setProperty('--rule-gap', gap + 'mm'); }
    return repeat(box, count, function () { return el('i'); });
  }

  // Lista de itens com caixa de seleção.
  function checkList(count) {
    return repeat(el('div', 'checks'), count, function () {
      var item = el('div', 'item');
      item.appendChild(el('b'));
      item.appendChild(el('i'));
      return item;
    });
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

  function isWeekend(dow) { return dow === 0 || dow === 6; }

  // ----- Contexto: tudo o que depende da configuração e é usado por várias páginas -----

  function createContext(cfg) {
    var months = [];
    for (var i = 0; i < cfg.monthCount; i++) {
      var dt = new Date(cfg.year, cfg.startMonth - 1 + i, 1);
      months.push({ y: dt.getFullYear(), m: dt.getMonth() });
    }
    var first = months[0];
    var last = months[months.length - 1];
    var years = [];
    for (var y = first.y - 1; y <= last.y + 1; y++) { years.push(y); } // inclui as semanas que cruzam a virada

    var custom = Cal.parseCustomDates(cfg.customDates);
    var from = new Date(first.y, first.m, 1);
    var to = new Date(last.y, last.m, Cal.daysInMonth(last.y, last.m));

    return {
      cfg: cfg,
      months: months,
      from: from,
      to: to,
      multiYear: first.y !== last.y,
      yearLabel: first.y === last.y ? String(first.y) : first.y + '/' + last.y,
      cols: Cal.columnDows(cfg.weekStart),
      events: Cal.buildEvents(years, {
        holidays: cfg.showHolidays,
        optional: cfg.showHolidays && cfg.showOptionalHolidays,
        custom: custom.items
      }),
      moon: cfg.showMoon ? Cal.moonPhases(new Date(first.y, first.m - 1, 1), new Date(last.y, last.m + 1, 28)) : {},
      customErrors: custom.errors
    };
  }

  function eventsOn(ctx, y, m, d) { return ctx.events[Cal.key(y, m, d)] || []; }

  function isHoliday(list) {
    return list.some(function (ev) { return ev.type === 'holiday'; });
  }

  function titleWithYear(ctx) {
    var title = ctx.cfg.title.trim();
    return (title ? title + ' ' : '') + ctx.yearLabel;
  }

  function footerLabel(ctx) {
    var org = ctx.cfg.orgName.trim();
    return (org ? org + '  /  ' : '') + titleWithYear(ctx);
  }

  function moonIcon(phase) {
    var icon = el('i', 'moon ' + phase);
    icon.title = MOON_LABEL[phase];
    return icon;
  }

  // Eventos do dia (feriados e datas próprias) como pequenas etiquetas de texto.
  function appendEvents(parent, list) {
    list.forEach(function (ev) { parent.appendChild(el('div', 'ev ' + ev.type, ev.text)); });
  }

  // ----- Estrutura comum das páginas internas -----

  function innerPage(ctx, opts) {
    var cfg = ctx.cfg;
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
    foot.appendChild(el('span', '', footerLabel(ctx)));
    foot.appendChild(el('span', 'page-number'));
    page.appendChild(foot);
    return page;
  }

  // Área de conteúdo entre o cabeçalho e o rodapé.
  function contentArea(page, className) {
    var area = el('div', 'content' + (className ? ' ' + className : ''));
    page.appendChild(area);
    return area;
  }

  // ----- Capa -----

  function coverPage(ctx) {
    var cfg = ctx.cfg;
    var pos = cfg.logoCover;
    var vertical = pos === 'none' ? 'none' : pos.split('-')[0];
    var page = el('section', 'page cover logo-' + vertical + ' align-' + cfg.titleAlign +
      (cfg.showNameField ? '' : ' no-name') + (ctx.multiYear ? ' long-year' : ''));

    if (pos !== 'none') {
      var logo = el('div', 'cover-logo v-' + vertical + ' h-' + pos.split('-')[1]);
      logo.style.setProperty('--logo-w', COVER_LOGO_W[cfg.logoCoverSize]);
      logo.appendChild(logoImg(cfg));
      page.appendChild(logo);
    }

    var body = el('div', 'cover-body');
    body.appendChild(bar());
    if (cfg.title.trim()) { body.appendChild(el('h1', 'cover-title', cfg.title.trim())); }
    body.appendChild(el('div', 'cover-year', ctx.yearLabel));
    if (cfg.subtitle.trim()) { body.appendChild(el('p', 'cover-subtitle', cfg.subtitle.trim())); }

    if (cfg.showNameField) {
      var name = el('div', 'cover-name');
      name.appendChild(el('span', '', cfg.nameLabel.trim() || 'Nome'));
      name.appendChild(el('i'));
      body.appendChild(name);
    }

    body.appendChild(repeat(el('div', 'cover-blocks'), 4, function () { return el('i'); }));
    if (cfg.city.trim()) { body.appendChild(el('div', 'cover-city', cfg.city.trim())); }
    page.appendChild(body);
    return page;
  }

  // ----- Visão anual (até 12 meses por página) -----

  function yearPages(ctx) {
    var pages = [];
    for (var start = 0; start < ctx.months.length; start += 12) {
      var page = innerPage(ctx, {
        eyebrow: titleWithYear(ctx),
        title: ctx.months.length === 12 ? 'Visão anual' : 'Visão geral'
      });
      var grid = el('div', 'year-grid');
      ctx.months.slice(start, start + 12).forEach(function (mo) {
        grid.appendChild(miniMonth(ctx, mo));
      });
      page.appendChild(grid);
      pages.push(page);
    }
    return pages;
  }

  function miniMonth(ctx, mo) {
    var mini = el('div', 'mini ' + quarterClass(mo.m));
    mini.appendChild(el('div', 'mini-name', MONTHS[mo.m] + (ctx.multiYear ? ' ' + mo.y : '')));
    var mg = el('div', 'mini-grid');
    ctx.cols.forEach(function (dow) { mg.appendChild(el('b', '', DOW_LETTER[dow])); });
    Cal.monthWeeks(mo.y, mo.m, ctx.cfg.weekStart).forEach(function (week) {
      week.forEach(function (day, col) {
        var cls = isWeekend(ctx.cols[col]) ? 'we' : '';
        if (day !== null && isHoliday(eventsOn(ctx, mo.y, mo.m, day))) { cls += ' hol'; }
        mg.appendChild(el('span', cls.trim(), day === null ? '' : String(day)));
      });
    });
    mini.appendChild(mg);
    return mini;
  }

  // ----- Calendário mensal -----

  function monthPage(ctx, mo) {
    var cfg = ctx.cfg;
    var page = innerPage(ctx, {
      quarter: quarterClass(mo.m),
      eyebrow: 'Calendário mensal  /  ' + mo.y,
      title: MONTHS[mo.m]
    });

    var grid = el('div', 'month-grid' + (cfg.bordersOnlyDates ? ' only-dates' : '') +
      (cfg.showWeekNumbers ? ' with-weeks' : ''));
    if (cfg.showWeekNumbers) { grid.appendChild(el('div', 'wk', 'Sem')); }
    ctx.cols.forEach(function (dow) { grid.appendChild(el('div', 'wd', DOW_SHORT[dow])); });

    Cal.monthWeeks(mo.y, mo.m, cfg.weekStart).forEach(function (week) {
      if (cfg.showWeekNumbers) {
        // A semana ISO é a da segunda-feira da linha (com início no domingo, a segunda é a 2ª coluna).
        var ref = null;
        week.forEach(function (day) { if (ref === null && day !== null) { ref = day; } });
        var monday = Cal.weekStartOf(new Date(mo.y, mo.m, ref), 'mon');
        if (cfg.weekStart === 'sun' && new Date(mo.y, mo.m, ref).getDay() === 0) {
          monday = new Date(mo.y, mo.m, ref + 1);
        }
        grid.appendChild(el('div', 'wk', String(Cal.isoWeek(monday))));
      }
      week.forEach(function (day, col) {
        var cls = 'day' + (isWeekend(ctx.cols[col]) ? ' we' : '') + (day === null ? ' empty' : '');
        var cell = el('div', cls);
        if (day !== null) {
          var list = eventsOn(ctx, mo.y, mo.m, day);
          if (isHoliday(list)) { cell.className += ' hol'; }
          var num = el('div', 'num');
          num.appendChild(el('span', '', String(day)));
          var phase = ctx.moon[Cal.key(mo.y, mo.m, day)];
          if (phase) { num.appendChild(moonIcon(phase)); }
          cell.appendChild(num);
          appendEvents(cell, list);
        }
        grid.appendChild(cell);
      });
    });
    page.appendChild(grid);

    if (cfg.showMoon) {
      var legend = el('div', 'legend');
      ['new', 'first', 'full', 'last'].forEach(function (phase) {
        var item = el('span');
        item.appendChild(moonIcon(phase));
        item.appendChild(document.createTextNode(MOON_LABEL[phase]));
        legend.appendChild(item);
      });
      page.appendChild(legend);
    }

    if (cfg.showPriorities) {
      var pri = el('div', 'priorities');
      pri.appendChild(el('h3', '', cfg.prioritiesTitle.trim() || 'Prioridades do mês'));
      pri.appendChild(checkList(3));
      page.appendChild(pri);
    }
    return page;
  }

  // ----- Metas -----

  function goalsPage(ctx) {
    var page = innerPage(ctx, { eyebrow: titleWithYear(ctx), title: 'Metas' });
    var area = contentArea(page, 'goals');
    for (var i = 1; i <= 4; i++) {
      var card = el('div', 'goal q' + i);
      card.appendChild(el('div', 'goal-tag', 'Meta ' + i));
      card.appendChild(writeLines(2, 8));
      card.appendChild(el('h4', '', 'Por que é importante'));
      card.appendChild(writeLines(2, 8));
      card.appendChild(el('h4', '', 'Passos'));
      card.appendChild(checkList(3));
      var due = el('div', 'goal-due');
      due.appendChild(el('span', '', 'Prazo'));
      due.appendChild(el('i'));
      card.appendChild(due);
      area.appendChild(card);
    }
    return page;
  }

  // ----- Tracker de hábitos -----

  function habitsPage(ctx, mo) {
    var page = innerPage(ctx, {
      quarter: quarterClass(mo.m),
      eyebrow: MONTHS[mo.m] + '  /  ' + mo.y,
      title: 'Hábitos'
    });
    var area = contentArea(page);
    var total = Cal.daysInMonth(mo.y, mo.m);
    var table = el('div', 'habits');
    table.style.gridTemplateColumns = '38mm repeat(' + total + ', 1fr)';

    function row(kind, label, cellText) {
      table.appendChild(el('div', 'h-name ' + kind, label));
      for (var d = 1; d <= total; d++) {
        var dow = new Date(mo.y, mo.m, d).getDay();
        table.appendChild(el('div', 'h-cell ' + kind + (isWeekend(dow) ? ' we' : ''), cellText ? cellText(d, dow) : ''));
      }
    }
    row('h-head', 'Hábito', function (d, dow) { return DOW_LETTER[dow]; });
    row('h-head h-num', '', function (d) { return String(d); });
    for (var i = 0; i < 12; i++) { row('', ''); }
    area.appendChild(table);

    area.appendChild(el('h3', 'section', 'Observações'));
    area.appendChild(writeLines(5, 8));
    return page;
  }

  // ----- Páginas semanais -----

  function weekRange(start) {
    var end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
    if (start.getMonth() === end.getMonth()) {
      return start.getDate() + ' a ' + end.getDate() + ' de ' + MONTHS[end.getMonth()].toLowerCase();
    }
    return start.getDate() + ' ' + MONTHS_SHORT[start.getMonth()] + ' a ' + end.getDate() + ' ' + MONTHS_SHORT[end.getMonth()];
  }

  function weekPage(ctx, start) {
    var cfg = ctx.cfg;
    var days = [];
    for (var i = 0; i < 7; i++) {
      days.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
    }
    // A semana ISO é identificada pela quinta-feira que ela contém.
    var thursday = days.filter(function (d) { return d.getDay() === 4; })[0];
    var page = innerPage(ctx, {
      quarter: quarterClass(thursday.getMonth()),
      eyebrow: 'Semana ' + Cal.isoWeek(thursday) + '  /  ' + thursday.getFullYear(),
      title: weekRange(start)
    });
    var area = contentArea(page);

    function dayLabel(d, long) {
      var box = el('div', 'w-label' + (isWeekend(d.getDay()) ? ' we' : ''));
      var list = eventsOn(ctx, d.getFullYear(), d.getMonth(), d.getDate());
      if (isHoliday(list)) { box.className += ' hol'; }
      box.appendChild(el('span', 'w-dow', long ? DOW_LONG[d.getDay()] : DOW_SHORT[d.getDay()]));
      var num = el('div', 'num');
      num.appendChild(el('span', '', String(d.getDate())));
      var phase = ctx.moon[Cal.key(d.getFullYear(), d.getMonth(), d.getDate())];
      if (phase) { num.appendChild(moonIcon(phase)); }
      box.appendChild(num);
      appendEvents(box, list);
      return box;
    }

    if (cfg.weeklyLayout === 'columns') {
      var grid = el('div', 'week-cols');
      grid.appendChild(el('div', 'w-corner'));
      days.forEach(function (d) { grid.appendChild(dayLabel(d, false)); });
      for (var hour = 7; hour <= 22; hour++) {
        grid.appendChild(el('div', 'w-hour', hour + 'h'));
        days.forEach(function (d) {
          grid.appendChild(el('div', 'w-slot' + (isWeekend(d.getDay()) ? ' we' : '')));
        });
      }
      area.appendChild(grid);
    } else {
      var rows = el('div', 'week-rows');
      days.forEach(function (d) {
        var row = el('div', 'w-row');
        row.appendChild(dayLabel(d, true));
        row.appendChild(writeLines(3, 7.5));
        rows.appendChild(row);
      });
      area.appendChild(rows);
    }
    return page;
  }

  // Semanas do período, agrupadas pelo índice do mês em que começam.
  function weeksByMonth(ctx) {
    var groups = ctx.months.map(function () { return []; });
    var index = {};
    ctx.months.forEach(function (mo, i) { index[mo.y + '-' + mo.m] = i; });
    var cursor = Cal.weekStartOf(ctx.from, ctx.cfg.weekStart);
    while (cursor <= ctx.to) {
      var i = index[cursor.getFullYear() + '-' + cursor.getMonth()];
      groups[i === undefined ? 0 : i].push(cursor);
      cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 7);
    }
    return groups;
  }

  // ----- Revisão do mês -----

  function reviewPage(ctx, mo) {
    var page = innerPage(ctx, {
      quarter: quarterClass(mo.m),
      eyebrow: MONTHS[mo.m] + '  /  ' + mo.y,
      title: 'Revisão do mês'
    });
    var area = contentArea(page);
    ['O que deu certo', 'O que pode melhorar', 'Aprendizados', 'Foco do próximo mês'].forEach(function (text) {
      area.appendChild(el('h3', 'section', text));
      area.appendChild(writeLines(5, 7.5));
    });
    return page;
  }

  // ----- Folha de anotações (linhas, pontilhado, quadriculado ou em branco) -----

  function patternSheet(style, gap) {
    var cols = Math.floor(CONTENT_WIDTH / gap);
    var rows = Math.floor(RULED_HEIGHT / gap);
    var w = cols * gap;
    var h = rows * gap;
    var sheet = svg('svg', {
      'class': 'pattern', viewBox: '0 0 ' + w + ' ' + h,
      width: w + 'mm', height: h + 'mm', 'aria-hidden': 'true'
    });
    var d = '';
    var x, y;
    if (style === 'grid') {
      for (x = 0; x <= cols; x++) { d += 'M' + (x * gap) + ' 0V' + h; }
      for (y = 0; y <= rows; y++) { d += 'M0 ' + (y * gap) + 'H' + w; }
      sheet.appendChild(svg('path', { d: d, 'class': 'grid-line' }));
    } else {
      // Pontilhado: traços de comprimento zero com ponta arredondada viram pontos.
      for (y = 0; y <= rows; y++) {
        for (x = 0; x <= cols; x++) { d += 'M' + (x * gap) + ' ' + (y * gap) + 'h0'; }
      }
      sheet.appendChild(svg('path', { d: d, 'class': 'dot' }));
    }
    return sheet;
  }

  function ruledPage(ctx, mo) {
    var cfg = ctx.cfg;
    var page = innerPage(ctx, {
      quarter: quarterClass(mo.m),
      eyebrow: MONTHS[mo.m] + '  /  ' + mo.y,
      title: cfg.ruledTitle.trim() || 'Anotações'
    });
    if (cfg.ruledStyle === 'lines') {
      var ruled = el('div', 'ruled');
      ruled.style.setProperty('--rule-gap', cfg.ruledGap + 'mm');
      repeat(ruled, Math.floor(RULED_HEIGHT / cfg.ruledGap), function () { return el('i'); });
      page.appendChild(ruled);
    } else if (cfg.ruledStyle !== 'blank') {
      var holder = el('div', 'pattern-holder');
      holder.appendChild(patternSheet(cfg.ruledStyle, cfg.ruledGap));
      page.appendChild(holder);
    }
    return page;
  }

  // ----- Montagem -----

  // Devolve as páginas na ordem de impressão (já numeradas) e os avisos para a interface.
  function build(cfg) {
    var ctx = createContext(cfg);
    var pages = [coverPage(ctx)];
    if (cfg.showYearView) { pages = pages.concat(yearPages(ctx)); }
    if (cfg.showGoals) { pages.push(goalsPage(ctx)); }

    var weeks = cfg.showWeekly ? weeksByMonth(ctx) : null;
    ctx.months.forEach(function (mo, index) {
      pages.push(monthPage(ctx, mo));
      if (cfg.showHabits) { pages.push(habitsPage(ctx, mo)); }
      if (weeks) { weeks[index].forEach(function (start) { pages.push(weekPage(ctx, start)); }); }
      if (cfg.showReview) { pages.push(reviewPage(ctx, mo)); }
      // As folhas de anotações ficam ENTRE os meses: não há folhas depois do último (como no modelo).
      if (cfg.ruledEnabled && index < ctx.months.length - 1) {
        for (var n = 0; n < cfg.ruledCount; n++) { pages.push(ruledPage(ctx, mo)); }
      }
    });

    pages.forEach(function (page, index) {
      var num = page.querySelector('.page-number');
      if (num) { num.textContent = String(index + 1).padStart(2, '0'); }
    });
    return { pages: pages, yearLabel: ctx.yearLabel, customErrors: ctx.customErrors };
  }

  global.PlannerPages = { build: build, MONTHS: MONTHS };
})(window);
