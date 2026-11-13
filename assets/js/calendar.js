// assets/js/calendar.js
// Cálculos de calendário: semanas, semana ISO, feriados nacionais, fases da lua e datas próprias.
// Tudo é calculado no navegador, para qualquer ano, sem consultar serviços externos.
(function (global) {
  'use strict';

  var DAY_MS = 86400000;

  function key(y, m, d) { return y + '-' + m + '-' + d; } // m de 0 a 11

  function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }

  // Semanas do mês: matriz de 7 colunas com o dia ou null. weekStart: 'mon' | 'sun'.
  function monthWeeks(y, m, weekStart) {
    var firstDow = new Date(y, m, 1).getDay();
    var offset = weekStart === 'sun' ? firstDow : (firstDow + 6) % 7;
    var total = daysInMonth(y, m);
    var cells = [];
    var i;
    for (i = 0; i < offset; i++) { cells.push(null); }
    for (i = 1; i <= total; i++) { cells.push(i); }
    while (cells.length % 7 !== 0) { cells.push(null); }
    var weeks = [];
    for (i = 0; i < cells.length; i += 7) { weeks.push(cells.slice(i, i + 7)); }
    return weeks;
  }

  // Dia da semana (0 = domingo) de cada coluna da grade.
  function columnDows(weekStart) {
    var first = weekStart === 'sun' ? 0 : 1;
    var cols = [];
    for (var i = 0; i < 7; i++) { cols.push((first + i) % 7); }
    return cols;
  }

  // Número da semana pela norma ISO 8601 (a semana 1 é a que contém a primeira quinta-feira do ano).
  function isoWeek(date) {
    var d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    var dow = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dow);
    var yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
    return Math.ceil(((d - yearStart) / DAY_MS + 1) / 7);
  }

  // Primeiro dia da semana que contém a data.
  function weekStartOf(date, weekStart) {
    var dow = date.getDay();
    var back = weekStart === 'sun' ? dow : (dow + 6) % 7;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() - back);
  }

  // Domingo de Páscoa (algoritmo gregoriano de Meeus/Jones/Butcher).
  function easter(y) {
    var a = y % 19, b = Math.floor(y / 100), c = y % 100;
    var d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    var g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    var i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
    var m = Math.floor((a + 11 * h + 22 * l) / 451);
    var month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
    var day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(y, month, day);
  }

  var FIXED_HOLIDAYS = [
    [0, 1, 'Confraternização Universal'],
    [3, 21, 'Tiradentes'],
    [4, 1, 'Dia do Trabalho'],
    [8, 7, 'Independência do Brasil'],
    [9, 12, 'Nossa Senhora Aparecida'],
    [10, 2, 'Finados'],
    [10, 15, 'Proclamação da República'],
    [10, 20, 'Consciência Negra'],
    [11, 25, 'Natal']
  ];

  // Feriados nacionais do ano. Com includeOptional, soma os pontos facultativos móveis;
  // com includeState, o feriado estadual de São Paulo (9 de julho).
  function holidays(y, includeOptional, includeState) {
    var list = FIXED_HOLIDAYS.map(function (h) {
      return { y: y, m: h[0], d: h[1], text: h[2], type: 'holiday' };
    });
    var pascoa = easter(y);
    function rel(days, text, type) {
      var dt = new Date(pascoa.getFullYear(), pascoa.getMonth(), pascoa.getDate() + days);
      list.push({ y: y, m: dt.getMonth(), d: dt.getDate(), text: text, type: type });
    }
    rel(-2, 'Sexta-feira Santa', 'holiday');
    if (includeState) {
      list.push({ y: y, m: 6, d: 9, text: 'Revolução Constitucionalista (SP)', type: 'holiday' });
    }
    if (includeOptional) {
      rel(-48, 'Carnaval', 'optional');
      rel(-47, 'Carnaval', 'optional');
      rel(-46, 'Quarta-feira de Cinzas', 'optional');
      rel(60, 'Corpus Christi', 'optional');
    }
    return list;
  }

  // Datas próprias: uma por linha, "DD/MM Texto" (repete todo ano) ou "DD/MM/AAAA Texto".
  // Devolve os itens válidos e os números das linhas que não puderam ser lidas.
  function parseCustomDates(text) {
    var items = [];
    var errors = [];
    String(text || '').split(/\r?\n/).forEach(function (line, index) {
      line = line.trim();
      if (!line) { return; }
      var match = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\s*[-–—:]?\s*(\S.*)$/.exec(line);
      if (!match) { errors.push(index + 1); return; }
      var d = parseInt(match[1], 10);
      var m = parseInt(match[2], 10) - 1;
      var y = match[3] ? parseInt(match[3], 10) : null;
      // Sem ano, valida contra um ano bissexto para aceitar 29/02.
      if (m < 0 || m > 11 || d < 1 || d > daysInMonth(y === null ? 2024 : y, m)) {
        errors.push(index + 1);
        return;
      }
      items.push({ y: y, m: m, d: d, text: match[4].trim().slice(0, 60) });
    });
    return { items: items, errors: errors };
  }

  // Mapa "ano-mês-dia" -> lista de eventos, para os anos informados.
  function buildEvents(years, opts) {
    var map = {};
    function add(y, m, d, text, type) {
      if (d > daysInMonth(y, m)) { return; } // 29/02 em ano não bissexto
      var k = key(y, m, d);
      (map[k] = map[k] || []).push({ text: text, type: type });
    }
    years.forEach(function (y) {
      if (opts.holidays) {
        holidays(y, opts.optional, opts.state).forEach(function (h) { add(h.y, h.m, h.d, h.text, h.type); });
      }
      // Listas de datas informadas pelo usuário: [{ items, type }]
      (opts.lists || []).forEach(function (list) {
        list.items.forEach(function (c) {
          if (c.y === null || c.y === y) { add(y, c.m, c.d, c.text, list.type); }
        });
      });
    });
    return map;
  }

  // ----- Calendário letivo: períodos, eventos recorrentes e turmas -----

  var DOW_BY_NAME = { dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6, 'sáb': 6 };
  var DOW_PATTERN = '(dom|seg|ter|qua|qui|sex|s[áa]b)[a-zçáã]*(?:-feira)?';

  function forEachLine(text, handler) {
    String(text || '').split(/\r?\n/).forEach(function (line, index) {
      line = line.trim();
      if (line) { handler(line, index + 1); }
    });
  }

  function makeDate(d, m, y) {
    d = parseInt(d, 10); m = parseInt(m, 10) - 1; y = parseInt(y, 10);
    if (m < 0 || m > 11 || d < 1 || d > daysInMonth(y, m)) { return null; }
    return new Date(y, m, d);
  }

  // Intervalos: "DD/MM/AAAA a DD/MM/AAAA Nome" (bimestres, recessos, férias).
  function parseRanges(text, fallbackName) {
    var items = [];
    var errors = [];
    var re = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s*(?:a|à|até|ate|-|–|—)\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*[-–—:]?\s*(.*)$/i;
    forEachLine(text, function (line, number) {
      var m = re.exec(line);
      var from = m && makeDate(m[1], m[2], m[3]);
      var to = m && makeDate(m[4], m[5], m[6]);
      if (!from || !to || from > to) { errors.push(number); return; }
      items.push({ from: from, to: to, text: (m[7].trim() || fallbackName).slice(0, 40) });
    });
    return { items: items, errors: errors };
  }

  // Eventos recorrentes: "seg HTPC" (toda segunda), "1ª qua Conselho", "última sex Reunião de pais".
  function parseRecurring(text) {
    var items = [];
    var errors = [];
    var re = new RegExp('^(?:([1-4])\\s*[ªaº°]?\\s+|([úu]ltim[ao])\\s+)?' + DOW_PATTERN + '\\s*[-–—:]?\\s+(\\S.*)$', 'i');
    forEachLine(text, function (line, number) {
      var m = re.exec(line);
      if (!m) { errors.push(number); return; }
      items.push({
        ord: m[1] ? parseInt(m[1], 10) : (m[2] ? 'last' : null),
        dow: DOW_BY_NAME[m[3].toLowerCase()],
        text: m[4].trim().slice(0, 60)
      });
    });
    return { items: items, errors: errors };
  }

  function recurringMatches(item, date) {
    if (date.getDay() !== item.dow) { return false; }
    if (item.ord === null) { return true; }
    var d = date.getDate();
    if (item.ord === 'last') { return d + 7 > daysInMonth(date.getFullYear(), date.getMonth()); }
    return Math.ceil(d / 7) === item.ord;
  }

  // Turmas: uma linha "Turma: 5º A | seg, qua, sex" seguida dos nomes dos alunos, um por linha.
  function parseClasses(text) {
    var items = [];
    var errors = [];
    var current = null;
    var dowRe = new RegExp(DOW_PATTERN, 'ig');
    forEachLine(text, function (line, number) {
      var m = /^turma\s*:\s*([^|]+)\|(.*)$/i.exec(line);
      if (m) {
        var dows = [];
        var found;
        dowRe.lastIndex = 0;
        while ((found = dowRe.exec(m[2])) !== null) {
          var dow = DOW_BY_NAME[found[1].toLowerCase()];
          if (dows.indexOf(dow) < 0) { dows.push(dow); }
        }
        if (!dows.length || !m[1].trim()) { errors.push(number); current = null; return; }
        current = { name: m[1].trim().slice(0, 40), dows: dows, students: [] };
        items.push(current);
      } else if (current && !/^turma\s*:/i.test(line)) {
        current.students.push(line.slice(0, 60));
      } else {
        errors.push(number);
      }
    });
    return { items: items, errors: errors };
  }

  // ----- Fases da lua (Jean Meeus, "Astronomical Algorithms", cap. 49) -----

  var PHASES = ['new', 'first', 'full', 'last'];
  var RAD = Math.PI / 180;

  // Instante (ms desde 1970, UTC) da fase de índice k (inteiro = nova; +0,25 crescente; +0,5 cheia; +0,75 minguante).
  function phaseTime(k) {
    var phase = Math.round((k - Math.floor(k)) * 4) % 4;
    var T = k / 1236.85;
    var jde = 2451550.09766 + 29.530588861 * k + 0.00015437 * T * T -
      0.00000015 * T * T * T + 0.00000000073 * T * T * T * T;
    var E = 1 - 0.002516 * T - 0.0000074 * T * T;
    var M = (2.5534 + 29.1053567 * k - 0.0000014 * T * T) * RAD;
    var Ml = (201.5643 + 385.81693528 * k + 0.0107582 * T * T + 0.00001238 * T * T * T) * RAD;
    var F = (160.7108 + 390.67050284 * k - 0.0016118 * T * T) * RAD;
    var O = (124.7746 - 1.56375588 * k + 0.0020672 * T * T) * RAD;
    var s = Math.sin;
    var corr;
    if (phase === 0 || phase === 2) {
      var c = phase === 0 ?
        [-0.4072, 0.17241, 0.01608, 0.01039, 0.00739, -0.00514, 0.00208] :
        [-0.40614, 0.17302, 0.01614, 0.01043, 0.00734, -0.00515, 0.00209];
      corr = c[0] * s(Ml) + c[1] * E * s(M) + c[2] * s(2 * Ml) + c[3] * s(2 * F) +
        c[4] * E * s(Ml - M) + c[5] * E * s(Ml + M) + c[6] * E * E * s(2 * M) -
        0.00111 * s(Ml - 2 * F) - 0.00057 * s(Ml + 2 * F) + 0.00056 * E * s(2 * Ml + M) -
        0.00042 * s(3 * Ml) + 0.00042 * E * s(M + 2 * F) + 0.00038 * E * s(M - 2 * F) -
        0.00024 * E * s(2 * Ml - M) - 0.00017 * s(O);
    } else {
      corr = -0.62801 * s(Ml) + 0.17172 * E * s(M) - 0.01183 * E * s(Ml + M) + 0.00862 * s(2 * Ml) +
        0.00804 * s(2 * F) + 0.00454 * E * s(Ml - M) + 0.00204 * E * E * s(2 * M) -
        0.0018 * s(Ml - 2 * F) - 0.0007 * s(Ml + 2 * F) - 0.0004 * s(3 * Ml) -
        0.00034 * E * s(2 * Ml - M) + 0.00032 * E * s(M + 2 * F) + 0.00032 * E * s(M - 2 * F) -
        0.00028 * E * E * s(Ml + 2 * M) + 0.00027 * E * s(2 * Ml + M) - 0.00017 * s(O);
      var W = 0.00306 - 0.00038 * E * Math.cos(M) + 0.00026 * Math.cos(Ml) -
        0.00002 * Math.cos(Ml - M) + 0.00002 * Math.cos(Ml + M) + 0.00002 * Math.cos(2 * F);
      corr += phase === 1 ? W : -W;
    }
    // Tempo dinâmico -> UTC: diferença de cerca de 70 s na época atual.
    return (jde + corr - 2440587.5) * DAY_MS - 70000;
  }

  // Mapa "ano-mês-dia" -> fase, entre duas datas. As datas seguem o horário de Brasília (UTC-3).
  function moonPhases(from, to) {
    var map = {};
    var startYear = from.getFullYear() + from.getMonth() / 12;
    var k = Math.floor((startYear - 2000) * 12.3685) - 1;
    var limit = to.getTime() + 2 * DAY_MS;
    for (;;) {
      for (var q = 0; q < 4; q++) {
        var t = phaseTime(k + q / 4);
        if (t > limit) { return map; }
        var local = new Date(t - 3 * 3600000);
        map[key(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate())] = PHASES[q];
      }
      k++;
    }
  }

  global.PlannerCalendar = {
    key: key,
    daysInMonth: daysInMonth,
    monthWeeks: monthWeeks,
    columnDows: columnDows,
    isoWeek: isoWeek,
    weekStartOf: weekStartOf,
    easter: easter,
    holidays: holidays,
    parseCustomDates: parseCustomDates,
    parseRanges: parseRanges,
    parseRecurring: parseRecurring,
    recurringMatches: recurringMatches,
    parseClasses: parseClasses,
    buildEvents: buildEvents,
    phaseTime: phaseTime,
    moonPhases: moonPhases
  };
})(window);
