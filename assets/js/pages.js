// assets/js/pages.js
// Monta as páginas do planner (elementos DOM) a partir da configuração.
// Cada tipo de página é uma função; build() define a ordem e numera as páginas.
(function (global) {
  'use strict';

  (global.PlannerBuild = global.PlannerBuild || {}).pages = 4;

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

    var none = { items: [], errors: [] };
    var custom = Cal.parseCustomDates(cfg.customDates);
    var municipal = cfg.showHolidays && cfg.showMunicipalHolidays ? Cal.parseCustomDates(cfg.municipalHolidays) : none;
    var periods = Cal.parseRanges(cfg.schoolPeriods, 'Período letivo');
    var breaks = Cal.parseRanges(cfg.schoolBreaks, 'Recesso');
    var recurring = Cal.parseRecurring(cfg.recurringEvents);
    var classes = cfg.showAttendance ? Cal.parseClasses(cfg.classes) : none;
    var from = new Date(first.y, first.m, 1);
    var to = new Date(last.y, last.m, Cal.daysInMonth(last.y, last.m));

    var ctx = {
      cfg: cfg,
      months: months,
      from: from,
      to: to,
      multiYear: first.y !== last.y,
      yearLabel: first.y === last.y ? String(first.y) : first.y + '/' + last.y,
      cols: Cal.columnDows(cfg.weekStart),
      contentWidth: CONTENT_WIDTH - cfg.bindingMargin,
      events: Cal.buildEvents(years, {
        holidays: cfg.showHolidays,
        optional: cfg.showHolidays && cfg.showOptionalHolidays,
        state: cfg.showHolidays && cfg.showStateHoliday,
        lists: [{ items: municipal.items, type: 'holiday' }, { items: custom.items, type: 'custom' }]
      }),
      moon: cfg.showMoon ? Cal.moonPhases(new Date(first.y, first.m - 1, 1), new Date(last.y, last.m + 1, 28)) : {},
      periods: periods.items,
      breaks: breaks.items,
      hasSchool: periods.items.length > 0,
      classes: classes.items,
      meetings: months.map(function () { return []; }),
      // Linhas que não puderam ser lidas, por campo do formulário.
      errors: {
        customDates: custom.errors,
        municipalHolidays: municipal.errors,
        schoolPeriods: periods.errors,
        schoolBreaks: breaks.errors,
        recurringEvents: recurring.errors,
        classes: classes.errors
      }
    };
    applySchoolCalendar(ctx, recurring.items);
    return ctx;
  }

  function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function rangeAt(list, date) {
    for (var i = 0; i < list.length; i++) {
      if (date >= list[i].from && date <= list[i].to) { return list[i]; }
    }
    return null;
  }

  // Situação do dia no calendário letivo.
  // Dia letivo = segunda a sexta, dentro de um período letivo, fora de recesso e sem feriado ou ponto facultativo.
  function dayStatus(ctx, date) {
    var list = ctx.events[Cal.key(date.getFullYear(), date.getMonth(), date.getDate())] || [];
    var off = list.some(function (ev) { return ev.type === 'holiday' || ev.type === 'optional'; });
    var brk = rangeAt(ctx.breaks, date);
    var period = rangeAt(ctx.periods, date);
    var dow = date.getDay();
    return {
      off: off,
      brk: brk,
      period: period,
      school: !!period && !brk && !off && dow >= 1 && dow <= 5
    };
  }

  function countSchoolDays(ctx, from, to) {
    var total = 0;
    for (var d = new Date(from.getFullYear(), from.getMonth(), from.getDate()); d <= to;
      d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
      if (dayStatus(ctx, d).school) { total++; }
    }
    return total;
  }

  // Acrescenta ao calendário os marcos dos períodos, os recessos e os eventos recorrentes,
  // e separa as reuniões que ganham página de pauta/ata.
  function applySchoolCalendar(ctx, recurring) {
    var cfg = ctx.cfg;
    var keyword = cfg.meetingKeyword.trim().toLowerCase();
    var monthIndex = {};
    ctx.months.forEach(function (mo, i) { monthIndex[mo.y + '-' + mo.m] = i; });

    for (var d = new Date(ctx.from.getTime()); d <= ctx.to;
      d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
      var k = Cal.key(d.getFullYear(), d.getMonth(), d.getDate());
      var st = dayStatus(ctx, d);
      var list = ctx.events[k] || [];

      if (st.period && sameDay(d, st.period.from)) { list.push({ text: 'Início: ' + st.period.text, type: 'period' }); }
      if (st.period && sameDay(d, st.period.to)) { list.push({ text: 'Fim: ' + st.period.text, type: 'period' }); }
      if (st.brk && (sameDay(d, st.brk.from) || d.getDate() === 1)) { list.push({ text: st.brk.text, type: 'break' }); }

      // Recorrentes: não caem em feriado nem recesso; havendo períodos letivos, só dentro deles.
      if (!st.off && !st.brk && (!ctx.hasSchool || st.period)) {
        for (var r = 0; r < recurring.length; r++) {
          if (Cal.recurringMatches(recurring[r], d)) { list.push({ text: recurring[r].text, type: 'recurring' }); }
        }
      }
      if (list.length) { ctx.events[k] = list; }

      if (cfg.showMeetings && keyword) {
        for (var e = 0; e < list.length; e++) {
          var ev = list[e];
          if ((ev.type === 'custom' || ev.type === 'recurring') && ev.text.toLowerCase().indexOf(keyword) >= 0) {
            ctx.meetings[monthIndex[d.getFullYear() + '-' + d.getMonth()]].push({ date: new Date(d.getTime()), text: ev.text });
          }
        }
      }
    }
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
    if (opts.id) { page.id = opts.id; }
    if (cfg.showLinks) { page.appendChild(navTabs(ctx, opts.current)); }

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

  function monthId(mo) { return 'mes-' + mo.y + '-' + (mo.m + 1); }
  function weekId(start) { return 'semana-' + start.getFullYear() + '-' + (start.getMonth() + 1) + '-' + start.getDate(); }

  function link(target, className, text) {
    var a = el('a', className, text);
    a.href = '#' + target;
    return a;
  }

  // Abas na borda externa: levam à visão anual e a cada mês. No PDF viram links clicáveis.
  function navTabs(ctx, current) {
    var tabs = el('nav', 'tabs');
    if (ctx.cfg.showYearView) {
      tabs.appendChild(link('visao', 'tab q1' + (current === 'visao' ? ' on' : ''), 'Ano'));
    }
    ctx.months.forEach(function (mo) {
      var id = monthId(mo);
      tabs.appendChild(link(id, 'tab ' + quarterClass(mo.m) + (current === id ? ' on' : ''), MONTHS_SHORT[mo.m]));
    });
    return tabs;
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
        id: start === 0 ? 'visao' : null,
        current: 'visao',
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
    var miniLabel = MONTHS[mo.m] + (ctx.multiYear ? ' ' + mo.y : '');
    mini.appendChild(ctx.cfg.showLinks ? link(monthId(mo), 'mini-name', miniLabel) : el('div', 'mini-name', miniLabel));
    var mg = el('div', 'mini-grid');
    ctx.cols.forEach(function (dow) { mg.appendChild(el('b', '', DOW_LETTER[dow])); });
    Cal.monthWeeks(mo.y, mo.m, ctx.cfg.weekStart).forEach(function (week) {
      week.forEach(function (day, col) {
        var cls = isWeekend(ctx.cols[col]) ? 'we' : '';
        if (day !== null && isHoliday(eventsOn(ctx, mo.y, mo.m, day))) { cls += ' hol'; }
        if (day !== null && rangeAt(ctx.breaks, new Date(mo.y, mo.m, day))) { cls += ' brk'; }
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
      id: monthId(mo),
      current: monthId(mo),
      quarter: quarterClass(mo.m),
      eyebrow: 'Calendário mensal  /  ' + mo.y,
      title: MONTHS[mo.m]
    });
    var linkWeeks = cfg.showLinks && cfg.showWeekly;

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
          var date = new Date(mo.y, mo.m, day);
          if (isHoliday(list)) { cell.className += ' hol'; }
          if (rangeAt(ctx.breaks, date)) { cell.className += ' brk'; }
          var num = el('div', 'num');
          num.appendChild(linkWeeks ?
            link(weekId(Cal.weekStartOf(date, cfg.weekStart)), '', String(day)) : el('span', '', String(day)));
          var phase = ctx.moon[Cal.key(mo.y, mo.m, day)];
          if (phase) { num.appendChild(moonIcon(phase)); }
          cell.appendChild(num);
          appendEvents(cell, list);
        }
        grid.appendChild(cell);
      });
    });
    page.appendChild(grid);

    if (cfg.showMoon || ctx.hasSchool) {
      var legend = el('div', 'legend');
      if (cfg.showMoon) {
        ['new', 'first', 'full', 'last'].forEach(function (phase) {
          var item = el('span');
          item.appendChild(moonIcon(phase));
          item.appendChild(document.createTextNode(MOON_LABEL[phase]));
          legend.appendChild(item);
        });
      }
      if (ctx.hasSchool) {
        var last = new Date(mo.y, mo.m, Cal.daysInMonth(mo.y, mo.m));
        legend.appendChild(el('strong', '', 'Dias letivos: ' + countSchoolDays(ctx, new Date(mo.y, mo.m, 1), last)));
      }
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
      id: weekId(start),
      quarter: quarterClass(thursday.getMonth()),
      eyebrow: (cfg.weeklyLayout === 'lesson' ? 'Plano de aula  /  semana ' : 'Semana ') +
        Cal.isoWeek(thursday) + '  /  ' + thursday.getFullYear(),
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

    if (cfg.weeklyLayout === 'lesson') {
      // Plano de aula: uma linha por dia útil, com campo para o código da habilidade da BNCC.
      var plan = el('div', 'lesson');
      ['Dia', 'Turma / componente', 'Habilidade BNCC (código)', 'Objetivos e conteúdo', 'Atividades e recursos', 'Avaliação']
        .forEach(function (text) { plan.appendChild(el('div', 'l-head', text)); });
      days.filter(function (d) { return !isWeekend(d.getDay()); }).forEach(function (d) {
        plan.appendChild(dayLabel(d, false));
        repeat(plan, 5, function () { return el('div', 'l-cell'); });
      });
      area.appendChild(plan);
    } else if (cfg.weeklyLayout === 'columns') {
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

  // ----- Calendário letivo: página de resumo -----

  function pad2(n) { return String(n).padStart(2, '0'); }
  function shortDate(d) { return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear(); }
  function longDate(d) {
    return DOW_LONG[d.getDay()] + ', ' + d.getDate() + ' de ' + MONTHS[d.getMonth()].toLowerCase() + ' de ' + d.getFullYear();
  }

  function table(className, head) {
    var t = el('div', 'tbl ' + className);
    head.forEach(function (text) { t.appendChild(el('div', 'th', text)); });
    return t;
  }

  function schoolSummaryPage(ctx) {
    var page = innerPage(ctx, { eyebrow: titleWithYear(ctx), title: 'Calendário letivo' });
    var area = contentArea(page);
    var total = 0;

    if (ctx.periods.length) {
      area.appendChild(el('h3', 'section', 'Períodos letivos'));
      var t = table('t-periods', ['Período', 'Início', 'Fim', 'Dias letivos']);
      ctx.periods.slice(0, 8).forEach(function (p) {
        var n = countSchoolDays(ctx, p.from, p.to);
        total += n;
        [p.text, shortDate(p.from), shortDate(p.to), String(n)].forEach(function (text) { t.appendChild(el('div', 'td', text)); });
      });
      ['Total', '', '', String(total)].forEach(function (text) { t.appendChild(el('div', 'td total', text)); });
      area.appendChild(t);
    }

    if (ctx.breaks.length) {
      area.appendChild(el('h3', 'section', 'Recessos e férias'));
      var tb = table('t-breaks', ['Descrição', 'Início', 'Fim']);
      ctx.breaks.slice(0, 6).forEach(function (b) {
        [b.text, shortDate(b.from), shortDate(b.to)].forEach(function (text) { tb.appendChild(el('div', 'td', text)); });
      });
      area.appendChild(tb);
    }

    // Feriados e pontos facultativos do período, em ordem de data.
    var days = [];
    for (var d = new Date(ctx.from.getTime()); d <= ctx.to; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
      eventsOn(ctx, d.getFullYear(), d.getMonth(), d.getDate()).forEach(function (ev) {
        if (ev.type === 'holiday' || ev.type === 'optional') { days.push({ date: new Date(d.getTime()), text: ev.text }); }
      });
    }
    if (days.length) {
      area.appendChild(el('h3', 'section', 'Feriados e pontos facultativos'));
      var list = el('div', 'holiday-list');
      days.slice(0, 30).forEach(function (h) {
        var item = el('div', 'h-item');
        item.appendChild(el('b', '', pad2(h.date.getDate()) + '/' + pad2(h.date.getMonth() + 1) + ' ' + DOW_SHORT[h.date.getDay()].toLowerCase()));
        item.appendChild(el('span', '', h.text));
        list.appendChild(item);
      });
      area.appendChild(list);
    }

    if (!ctx.periods.length && !ctx.breaks.length && !days.length) {
      area.appendChild(el('p', 'empty-note', 'Informe os períodos letivos, os recessos ou ative os feriados para preencher esta página.'));
    }
    return page;
  }

  // ----- Pauta e ata de reunião (uma página por reunião encontrada no calendário) -----

  function meetingPage(ctx, meeting) {
    var page = innerPage(ctx, {
      quarter: quarterClass(meeting.date.getMonth()),
      eyebrow: longDate(meeting.date),
      title: meeting.text
    });
    var area = contentArea(page, 'meeting');
    var info = el('div', 'm-info');
    ['Horário', 'Local', 'Coordenação'].forEach(function (text) {
      var field = el('div', 'm-field');
      field.appendChild(el('span', '', text));
      field.appendChild(el('i'));
      info.appendChild(field);
    });
    area.appendChild(info);
    area.appendChild(el('h3', 'section', 'Pauta'));
    area.appendChild(checkList(4));
    area.appendChild(el('h3', 'section', 'Registro e deliberações'));
    area.appendChild(writeLines(11, 7.5));
    area.appendChild(el('h3', 'section', 'Encaminhamentos'));
    var t = table('t-actions', ['Ação', 'Responsável', 'Prazo']);
    repeat(t, 15, function () { return el('div', 'td'); });
    area.appendChild(t);
    return page;
  }

  // ----- Lista de chamada: colunas com as datas reais das aulas da turma no mês -----

  var ATTENDANCE_ROWS = 34;

  function attendancePages(ctx, mo) {
    var pages = [];
    var total = Cal.daysInMonth(mo.y, mo.m);
    ctx.classes.forEach(function (cls) {
      var dates = [];
      for (var d = 1; d <= total; d++) {
        var date = new Date(mo.y, mo.m, d);
        if (cls.dows.indexOf(date.getDay()) < 0) { continue; }
        var st = dayStatus(ctx, date);
        // Com períodos letivos informados, valem só os dias letivos; sem eles, pulam-se feriados e recessos.
        var counts = ctx.hasSchool ? (st.school || (!!st.period && !st.brk && !st.off)) : (!st.off && !st.brk);
        if (counts) { dates.push(date); }
      }
      if (!dates.length) { return; }

      var names = cls.students.length ? cls.students : null;
      var rows = names ? names.length : ATTENDANCE_ROWS;
      for (var start = 0; start < rows; start += ATTENDANCE_ROWS) {
        var page = innerPage(ctx, {
          quarter: quarterClass(mo.m),
          eyebrow: 'Chamada  /  ' + MONTHS[mo.m] + ' ' + mo.y,
          title: cls.name
        });
        var area = contentArea(page);
        var t = el('div', 'attendance');
        t.style.gridTemplateColumns = '7mm 46mm repeat(' + dates.length + ', 1fr) 10mm';
        t.appendChild(el('div', 'th', 'Nº'));
        t.appendChild(el('div', 'th name', 'Nome'));
        dates.forEach(function (date) {
          var th = el('div', 'th date');
          th.appendChild(el('b', '', pad2(date.getDate())));
          th.appendChild(el('span', '', DOW_SHORT[date.getDay()]));
          t.appendChild(th);
        });
        t.appendChild(el('div', 'th', 'Faltas'));
        for (var i = start; i < Math.min(rows, start + ATTENDANCE_ROWS); i++) {
          t.appendChild(el('div', 'td n', String(i + 1)));
          t.appendChild(el('div', 'td name', names ? names[i] : ''));
          repeat(t, dates.length + 1, function () { return el('div', 'td'); });
        }
        area.appendChild(t);
        pages.push(page);
      }
    });
    return pages;
  }

  // ----- Folha de anotações (linhas, pontilhado, quadriculado, Cornell ou em branco) -----

  function patternSheet(style, gap, width) {
    var cols = Math.floor(width / gap);
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
    } else if (cfg.ruledStyle === 'cornell') {
      // Método Cornell: coluna de tópicos à esquerda, anotações à direita e resumo no rodapé.
      var cornell = el('div', 'cornell');
      var cues = el('div', 'c-cues');
      cues.appendChild(el('span', 'c-tag', 'Tópicos e perguntas'));
      var notes = el('div', 'c-notes');
      notes.appendChild(el('span', 'c-tag', 'Anotações'));
      notes.appendChild(writeLines(Math.floor(160 / cfg.ruledGap), cfg.ruledGap));
      var summary = el('div', 'c-summary');
      summary.appendChild(el('span', 'c-tag', 'Resumo'));
      cornell.appendChild(cues);
      cornell.appendChild(notes);
      cornell.appendChild(summary);
      page.appendChild(cornell);
    } else if (cfg.ruledStyle !== 'blank') {
      var holder = el('div', 'pattern-holder');
      holder.appendChild(patternSheet(cfg.ruledStyle, cfg.ruledGap, ctx.contentWidth));
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
    if (cfg.showSchoolSummary) { pages.push(schoolSummaryPage(ctx)); }
    if (cfg.showGoals) { pages.push(goalsPage(ctx)); }

    var weeks = cfg.showWeekly ? weeksByMonth(ctx) : null;
    ctx.months.forEach(function (mo, index) {
      pages.push(monthPage(ctx, mo));
      if (cfg.showHabits) { pages.push(habitsPage(ctx, mo)); }
      if (weeks) { weeks[index].forEach(function (start) { pages.push(weekPage(ctx, start)); }); }
      if (cfg.showAttendance) { pages = pages.concat(attendancePages(ctx, mo)); }
      ctx.meetings[index].forEach(function (meeting) { pages.push(meetingPage(ctx, meeting)); });
      if (cfg.showReview) { pages.push(reviewPage(ctx, mo)); }
      // As folhas de anotações ficam ENTRE os meses: não há folhas depois do último (como no modelo).
      if (cfg.ruledEnabled && index < ctx.months.length - 1) {
        for (var n = 0; n < cfg.ruledCount; n++) { pages.push(ruledPage(ctx, mo)); }
      }
    });

    // Em frente e verso (e no livreto), a margem de encadernação alterna de lado nas páginas pares.
    var mirrored = cfg.duplex || cfg.booklet;
    var extra = (cfg.inkSaver ? ' eco' : '') + (cfg.highContrast ? ' hc' : '') + (cfg.largeText ? ' big' : '') +
      (mirrored ? ' mirrored' : '');
    pages.forEach(function (page, index) {
      var num = page.querySelector('.page-number');
      if (num) { num.textContent = pad2(index + 1); }
      page.className += extra + (index % 2 ? ' even' : ' odd');
      if (cfg.bindingMargin) { page.style.setProperty('--bind', cfg.bindingMargin + 'mm'); }
    });
    return { pages: pages, yearLabel: ctx.yearLabel, errors: ctx.errors };
  }

  global.PlannerPages = { build: build, MONTHS: MONTHS };
})(window);
