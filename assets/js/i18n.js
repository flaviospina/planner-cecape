// assets/js/i18n.js
// Idiomas do planner: todos os textos impressos nas páginas (meses, dias, títulos, feriados, datas).
// A interface do gerador continua em português; o idioma escolhido vale para o planner gerado.
(function (global) {
  'use strict';

  (global.PlannerBuild = global.PlannerBuild || {}).i18n = 7;

  function lower(text) { return text.toLowerCase(); }

  var LANGS = {
    'pt-BR': {
      label: 'Português (Brasil)',
      months: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
      monthsShort: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'],
      // Índice = dia da semana do JavaScript (0 = domingo).
      dowShort: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
      dowLong: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
      dowLetter: ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'],
      moon: { 'new': 'Lua nova', first: 'Quarto crescente', full: 'Lua cheia', last: 'Quarto minguante' },
      rangeSame: function (d1, d2, month) { return d1 + ' a ' + d2 + ' de ' + lower(month); },
      rangeCross: function (d1, m1, d2, m2) { return d1 + ' ' + m1 + ' a ' + d2 + ' ' + m2; },
      longDate: function (dow, d, month, y) { return dow + ', ' + d + ' de ' + lower(month) + ' de ' + y; },
      dayMonth: function (dd, mm) { return dd + '/' + mm; },
      hour: function (h) { return h + 'h'; },
      yearView: 'Visão anual', overview: 'Visão geral', monthlyCalendar: 'Calendário mensal', weekAbbr: 'Sem',
      schoolDays: 'Dias letivos', goals: 'Metas', goal: 'Meta', whyImportant: 'Por que é importante', steps: 'Passos',
      due: 'Prazo', habits: 'Hábitos', habit: 'Hábito', remarks: 'Observações', week: 'Semana',
      lessonPlan: 'Plano de aula', weekLower: 'semana',
      lessonHeads: ['Dia', 'Turma / componente', 'Habilidade BNCC (código)', 'Objetivos e conteúdo', 'Atividades e recursos', 'Avaliação'],
      review: 'Revisão do mês',
      reviewPrompts: ['O que deu certo', 'O que pode melhorar', 'Aprendizados', 'Foco do próximo mês'],
      schoolCalendar: 'Calendário letivo', schoolPeriods: 'Períodos letivos', period: 'Período', start: 'Início', end: 'Fim',
      total: 'Total', breaks: 'Recessos e férias', description: 'Descrição', holidaysTitle: 'Feriados e pontos facultativos',
      emptyNote: 'Informe os períodos letivos, os recessos ou ative os feriados para preencher esta página.',
      time: 'Horário', place: 'Local', lead: 'Coordenação', agenda: 'Pauta', minutes: 'Registro e deliberações',
      actions: 'Encaminhamentos', action: 'Ação', owner: 'Responsável',
      attendance: 'Chamada', num: 'Nº', name: 'Nome', absences: 'Faltas',
      cues: 'Tópicos e perguntas', notes: 'Anotações', summary: 'Resumo',
      defaultPeriod: 'Período letivo', defaultBreak: 'Recesso', tabYear: 'Ano',
      holidays: {
        newYear: 'Confraternização Universal', tiradentes: 'Tiradentes', labour: 'Dia do Trabalho',
        independence: 'Independência do Brasil', aparecida: 'Nossa Senhora Aparecida', allSouls: 'Finados',
        republic: 'Proclamação da República', blackAwareness: 'Consciência Negra', christmas: 'Natal',
        goodFriday: 'Sexta-feira Santa', carnival: 'Carnaval', ashWednesday: 'Quarta-feira de Cinzas',
        corpusChristi: 'Corpus Christi', spRevolution: 'Revolução Constitucionalista (SP)'
      },
      defaults: { subtitle: 'Planejamento mensal e anotações', nameLabel: 'Nome', prioritiesTitle: 'Prioridades do mês', ruledTitle: 'Anotações' }
    },

    'en-US': {
      label: 'English (US)',
      months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
      monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      dowShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      dowLong: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      dowLetter: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
      moon: { 'new': 'New moon', first: 'First quarter', full: 'Full moon', last: 'Last quarter' },
      rangeSame: function (d1, d2, month) { return month + ' ' + d1 + '–' + d2; },
      rangeCross: function (d1, m1, d2, m2) { return m1 + ' ' + d1 + ' – ' + m2 + ' ' + d2; },
      longDate: function (dow, d, month, y) { return dow + ', ' + month + ' ' + d + ', ' + y; },
      dayMonth: function (dd, mm) { return mm + '/' + dd; },
      hour: function (h) { return (h % 12 || 12) + (h < 12 ? ' am' : ' pm'); },
      yearView: 'Year at a glance', overview: 'Overview', monthlyCalendar: 'Monthly calendar', weekAbbr: 'Wk',
      schoolDays: 'School days', goals: 'Goals', goal: 'Goal', whyImportant: 'Why it matters', steps: 'Steps',
      due: 'Due', habits: 'Habits', habit: 'Habit', remarks: 'Notes', week: 'Week',
      lessonPlan: 'Lesson plan', weekLower: 'week',
      lessonHeads: ['Day', 'Class / subject', 'Standard (code)', 'Objectives and content', 'Activities and resources', 'Assessment'],
      review: 'Monthly review',
      reviewPrompts: ['What went well', 'What could be better', 'Lessons learned', 'Focus for next month'],
      schoolCalendar: 'School calendar', schoolPeriods: 'Terms', period: 'Term', start: 'Start', end: 'End',
      total: 'Total', breaks: 'Breaks and vacations', description: 'Description', holidaysTitle: 'Holidays and optional days off',
      emptyNote: 'Enter the terms and breaks, or turn on holidays, to fill in this page.',
      time: 'Time', place: 'Place', lead: 'Led by', agenda: 'Agenda', minutes: 'Minutes and decisions',
      actions: 'Action items', action: 'Action', owner: 'Owner',
      attendance: 'Attendance', num: 'No.', name: 'Name', absences: 'Absent',
      cues: 'Cues and questions', notes: 'Notes', summary: 'Summary',
      defaultPeriod: 'Term', defaultBreak: 'Break', tabYear: 'Year',
      holidays: {
        newYear: "New Year's Day", tiradentes: 'Tiradentes Day', labour: 'Labor Day',
        independence: 'Independence Day (Brazil)', aparecida: 'Our Lady of Aparecida', allSouls: "All Souls' Day",
        republic: 'Republic Day', blackAwareness: 'Black Awareness Day', christmas: 'Christmas Day',
        goodFriday: 'Good Friday', carnival: 'Carnival', ashWednesday: 'Ash Wednesday',
        corpusChristi: 'Corpus Christi', spRevolution: 'Constitutionalist Revolution (SP)'
      },
      defaults: { subtitle: 'Monthly planning and notes', nameLabel: 'Name', prioritiesTitle: 'Priorities for the month', ruledTitle: 'Notes' }
    },

    'es': {
      label: 'Español',
      months: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
      monthsShort: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
      dowShort: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
      dowLong: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
      dowLetter: ['D', 'L', 'M', 'X', 'J', 'V', 'S'],
      moon: { 'new': 'Luna nueva', first: 'Cuarto creciente', full: 'Luna llena', last: 'Cuarto menguante' },
      rangeSame: function (d1, d2, month) { return d1 + ' al ' + d2 + ' de ' + lower(month); },
      rangeCross: function (d1, m1, d2, m2) { return d1 + ' ' + m1 + ' al ' + d2 + ' ' + m2; },
      longDate: function (dow, d, month, y) { return dow + ', ' + d + ' de ' + lower(month) + ' de ' + y; },
      dayMonth: function (dd, mm) { return dd + '/' + mm; },
      hour: function (h) { return h + ' h'; },
      yearView: 'Vista anual', overview: 'Vista general', monthlyCalendar: 'Calendario mensual', weekAbbr: 'Sem',
      schoolDays: 'Días lectivos', goals: 'Metas', goal: 'Meta', whyImportant: 'Por qué es importante', steps: 'Pasos',
      due: 'Plazo', habits: 'Hábitos', habit: 'Hábito', remarks: 'Observaciones', week: 'Semana',
      lessonPlan: 'Plan de clase', weekLower: 'semana',
      lessonHeads: ['Día', 'Grupo / asignatura', 'Competencia (código)', 'Objetivos y contenido', 'Actividades y recursos', 'Evaluación'],
      review: 'Revisión del mes',
      reviewPrompts: ['Qué salió bien', 'Qué puede mejorar', 'Aprendizajes', 'Enfoque del próximo mes'],
      schoolCalendar: 'Calendario escolar', schoolPeriods: 'Períodos lectivos', period: 'Período', start: 'Inicio', end: 'Fin',
      total: 'Total', breaks: 'Recesos y vacaciones', description: 'Descripción', holidaysTitle: 'Feriados y días no laborables',
      emptyNote: 'Indique los períodos lectivos y los recesos, o active los feriados, para completar esta página.',
      time: 'Horario', place: 'Lugar', lead: 'Coordinación', agenda: 'Orden del día', minutes: 'Registro y acuerdos',
      actions: 'Tareas pendientes', action: 'Acción', owner: 'Responsable',
      attendance: 'Asistencia', num: 'N.º', name: 'Nombre', absences: 'Faltas',
      cues: 'Ideas clave y preguntas', notes: 'Notas', summary: 'Resumen',
      defaultPeriod: 'Período lectivo', defaultBreak: 'Receso', tabYear: 'Año',
      holidays: {
        newYear: 'Año Nuevo', tiradentes: 'Tiradentes', labour: 'Día del Trabajo',
        independence: 'Independencia de Brasil', aparecida: 'Nuestra Señora Aparecida', allSouls: 'Día de los Difuntos',
        republic: 'Proclamación de la República', blackAwareness: 'Conciencia Negra', christmas: 'Navidad',
        goodFriday: 'Viernes Santo', carnival: 'Carnaval', ashWednesday: 'Miércoles de Ceniza',
        corpusChristi: 'Corpus Christi', spRevolution: 'Revolución Constitucionalista (SP)'
      },
      defaults: { subtitle: 'Planificación mensual y notas', nameLabel: 'Nombre', prioritiesTitle: 'Prioridades del mes', ruledTitle: 'Notas' }
    },

    'it': {
      label: 'Italiano',
      months: ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'],
      monthsShort: ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'],
      dowShort: ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'],
      dowLong: ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'],
      dowLetter: ['D', 'L', 'M', 'M', 'G', 'V', 'S'],
      moon: { 'new': 'Luna nuova', first: 'Primo quarto', full: 'Luna piena', last: 'Ultimo quarto' },
      rangeSame: function (d1, d2, month) { return d1 + '–' + d2 + ' ' + lower(month); },
      rangeCross: function (d1, m1, d2, m2) { return d1 + ' ' + m1 + ' – ' + d2 + ' ' + m2; },
      longDate: function (dow, d, month, y) { return dow + ' ' + d + ' ' + lower(month) + ' ' + y; },
      dayMonth: function (dd, mm) { return dd + '/' + mm; },
      hour: function (h) { return h + ':00'; },
      yearView: 'Vista annuale', overview: 'Panoramica', monthlyCalendar: 'Calendario mensile', weekAbbr: 'Sett',
      schoolDays: 'Giorni di lezione', goals: 'Obiettivi', goal: 'Obiettivo', whyImportant: 'Perché è importante', steps: 'Passi',
      due: 'Scadenza', habits: 'Abitudini', habit: 'Abitudine', remarks: 'Osservazioni', week: 'Settimana',
      lessonPlan: 'Piano di lezione', weekLower: 'settimana',
      lessonHeads: ['Giorno', 'Classe / materia', 'Competenza (codice)', 'Obiettivi e contenuti', 'Attività e risorse', 'Valutazione'],
      review: 'Revisione del mese',
      reviewPrompts: ['Cosa è andato bene', 'Cosa può migliorare', 'Cosa ho imparato', 'Priorità del prossimo mese'],
      schoolCalendar: 'Calendario scolastico', schoolPeriods: 'Periodi didattici', period: 'Periodo', start: 'Inizio', end: 'Fine',
      total: 'Totale', breaks: 'Pause e vacanze', description: 'Descrizione', holidaysTitle: 'Festività e giorni facoltativi',
      emptyNote: 'Indica i periodi didattici e le pause, oppure attiva le festività, per compilare questa pagina.',
      time: 'Orario', place: 'Luogo', lead: 'Coordinamento', agenda: 'Ordine del giorno', minutes: 'Verbale e decisioni',
      actions: 'Azioni da svolgere', action: 'Azione', owner: 'Responsabile',
      attendance: 'Presenze', num: 'N.', name: 'Nome', absences: 'Assenze',
      cues: 'Spunti e domande', notes: 'Appunti', summary: 'Riepilogo',
      defaultPeriod: 'Periodo didattico', defaultBreak: 'Pausa', tabYear: 'Anno',
      holidays: {
        newYear: 'Capodanno', tiradentes: 'Tiradentes', labour: 'Festa del Lavoro',
        independence: 'Indipendenza del Brasile', aparecida: 'Nostra Signora Aparecida', allSouls: 'Commemorazione dei defunti',
        republic: 'Proclamazione della Repubblica', blackAwareness: 'Coscienza Nera', christmas: 'Natale',
        goodFriday: 'Venerdì Santo', carnival: 'Carnevale', ashWednesday: 'Mercoledì delle Ceneri',
        corpusChristi: 'Corpus Domini', spRevolution: 'Rivoluzione Costituzionalista (SP)'
      },
      defaults: { subtitle: 'Pianificazione mensile e appunti', nameLabel: 'Nome', prioritiesTitle: 'Priorità del mese', ruledTitle: 'Appunti' }
    },

    'fr': {
      label: 'Français',
      months: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
      monthsShort: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],
      dowShort: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
      dowLong: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
      dowLetter: ['D', 'L', 'M', 'M', 'J', 'V', 'S'],
      moon: { 'new': 'Nouvelle lune', first: 'Premier quartier', full: 'Pleine lune', last: 'Dernier quartier' },
      rangeSame: function (d1, d2, month) { return d1 + ' au ' + d2 + ' ' + lower(month); },
      rangeCross: function (d1, m1, d2, m2) { return d1 + ' ' + m1 + ' au ' + d2 + ' ' + m2; },
      longDate: function (dow, d, month, y) { return dow + ' ' + d + ' ' + lower(month) + ' ' + y; },
      dayMonth: function (dd, mm) { return dd + '/' + mm; },
      hour: function (h) { return h + ' h'; },
      yearView: 'Vue annuelle', overview: "Vue d'ensemble", monthlyCalendar: 'Calendrier mensuel', weekAbbr: 'Sem',
      schoolDays: 'Jours de classe', goals: 'Objectifs', goal: 'Objectif', whyImportant: "Pourquoi c'est important", steps: 'Étapes',
      due: 'Échéance', habits: 'Habitudes', habit: 'Habitude', remarks: 'Observations', week: 'Semaine',
      lessonPlan: 'Plan de cours', weekLower: 'semaine',
      lessonHeads: ['Jour', 'Classe / matière', 'Compétence (code)', 'Objectifs et contenu', 'Activités et ressources', 'Évaluation'],
      review: 'Bilan du mois',
      reviewPrompts: ['Ce qui a bien marché', 'Ce qui peut être amélioré', 'Ce que j’ai appris', 'Priorité du mois prochain'],
      schoolCalendar: 'Calendrier scolaire', schoolPeriods: 'Périodes scolaires', period: 'Période', start: 'Début', end: 'Fin',
      total: 'Total', breaks: 'Congés et vacances', description: 'Description', holidaysTitle: 'Jours fériés et jours facultatifs',
      emptyNote: 'Indiquez les périodes scolaires et les congés, ou activez les jours fériés, pour remplir cette page.',
      time: 'Horaire', place: 'Lieu', lead: 'Coordination', agenda: 'Ordre du jour', minutes: 'Compte rendu et décisions',
      actions: 'Actions à mener', action: 'Action', owner: 'Responsable',
      attendance: 'Présences', num: 'N°', name: 'Nom', absences: 'Absences',
      cues: 'Mots-clés et questions', notes: 'Notes', summary: 'Résumé',
      defaultPeriod: 'Période scolaire', defaultBreak: 'Congé', tabYear: 'Année',
      holidays: {
        newYear: "Jour de l'An", tiradentes: 'Tiradentes', labour: 'Fête du Travail',
        independence: 'Indépendance du Brésil', aparecida: 'Notre-Dame d’Aparecida', allSouls: 'Jour des Défunts',
        republic: 'Proclamation de la République', blackAwareness: 'Conscience noire', christmas: 'Noël',
        goodFriday: 'Vendredi saint', carnival: 'Carnaval', ashWednesday: 'Mercredi des Cendres',
        corpusChristi: 'Fête-Dieu', spRevolution: 'Révolution constitutionnaliste (SP)'
      },
      defaults: { subtitle: 'Planification mensuelle et notes', nameLabel: 'Nom', prioritiesTitle: 'Priorités du mois', ruledTitle: 'Notes' }
    }
  };

  var CODES = Object.keys(LANGS);

  function get(code) { return LANGS[code] || LANGS['pt-BR']; }

  global.PlannerI18n = { codes: CODES, get: get };
})(window);
