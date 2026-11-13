// assets/js/dialogs.js
// Caixas de diálogo do gerador (SweetAlert2): confirmação de ações, avisos e pequenos formulários.
// Todo texto entra como nó de texto (nunca como HTML), inclusive nomes vindos do usuário ou do servidor.
// Se a biblioteca não carregar, usa as caixas simples do navegador.
(function (global) {
  'use strict';

  (global.PlannerBuild = global.PlannerBuild || {}).dialogs = 4;

  var Swal = global.Swal || null;
  var TEAL = '#1a7185';
  var DANGER = '#a3352b';

  function node(tag, className, text) {
    var el = document.createElement(tag);
    if (className) { el.className = className; }
    if (text !== undefined && text !== null) { el.textContent = text; }
    return el;
  }

  // Corpo da caixa: parágrafos, lista de itens e um aviso em destaque.
  function body(opts) {
    var box = node('div', 'dlg-body');
    [].concat(opts.text || []).forEach(function (t) { box.appendChild(node('p', '', t)); });
    if (opts.items && opts.items.length) {
      var list = node('ul', 'dlg-list');
      opts.items.forEach(function (t) { list.appendChild(node('li', '', t)); });
      box.appendChild(list);
    }
    if (opts.note) { box.appendChild(node('p', 'dlg-note', opts.note)); }
    return box;
  }

  function plain(opts) {
    return [opts.title].concat(opts.text || [], opts.items || [], opts.note || []).join('\n\n');
  }

  // Pergunta com botões de confirmar e cancelar. Resolve com true ou false.
  function confirm(opts) {
    if (!Swal) { return Promise.resolve(global.confirm(plain(opts))); }
    return Swal.fire({
      title: opts.title,
      html: body(opts),
      icon: opts.icon || (opts.danger ? 'warning' : 'question'),
      showCancelButton: true,
      confirmButtonText: opts.confirmText || 'Confirmar',
      cancelButtonText: opts.cancelText || 'Cancelar',
      confirmButtonColor: opts.danger ? DANGER : TEAL,
      reverseButtons: true,
      focusCancel: !!opts.danger
    }).then(function (result) { return result.isConfirmed; });
  }

  // Aviso com um único botão. type: success | error | warning | info.
  function notify(type, title, text) {
    if (!Swal) { global.alert(title + (text ? '\n\n' + text : '')); return Promise.resolve(); }
    return Swal.fire({
      title: title,
      html: body({ text: text }),
      icon: type,
      confirmButtonText: 'Entendi',
      confirmButtonColor: TEAL
    }).then(function () {});
  }

  // Aviso rápido no canto da tela, que some sozinho.
  function toast(type, text) {
    if (!Swal) { return; }
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: type,
      title: text,
      showConfirmButton: false,
      timer: 3500,
      timerProgressBar: true
    });
  }

  // Pequeno formulário. fields: [{ name, label, type, value, placeholder, hint }]
  // (type: text | email | password | checkbox). validate(values) devolve a mensagem de erro ou null.
  // Resolve com os valores ou com null quando a pessoa cancela.
  function form(opts) {
    if (!Swal) {
      var values = {};
      for (var i = 0; i < opts.fields.length; i++) {
        var f = opts.fields[i];
        if (f.type === 'checkbox') {
          values[f.name] = global.confirm(f.label + '?');
        } else {
          var answer = global.prompt(opts.title + '\n\n' + f.label, f.value || '');
          if (answer === null) { return Promise.resolve(null); }
          values[f.name] = answer;
        }
      }
      var problem = opts.validate ? opts.validate(values) : null;
      if (problem) { global.alert(problem); return Promise.resolve(null); }
      return Promise.resolve(values);
    }

    var box = body(opts);
    var inputs = {};
    opts.fields.forEach(function (f) {
      var label = node('label', f.type === 'checkbox' ? 'dlg-check' : 'dlg-field');
      var input = node('input');
      input.type = f.type || 'text';
      if (f.type === 'checkbox') {
        input.checked = !!f.value;
        label.appendChild(input);
        label.appendChild(node('span', '', f.label));
      } else {
        input.value = f.value || '';
        if (f.placeholder) { input.placeholder = f.placeholder; }
        if (f.maxLength) { input.maxLength = f.maxLength; }
        input.autocomplete = f.autocomplete || 'off';
        label.appendChild(node('span', '', f.label));
        label.appendChild(input);
      }
      if (f.hint) { label.appendChild(node('small', '', f.hint)); }
      inputs[f.name] = input;
      box.appendChild(label);
    });

    return Swal.fire({
      title: opts.title,
      html: box,
      showCancelButton: true,
      confirmButtonText: opts.confirmText || 'Confirmar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: opts.danger ? DANGER : TEAL,
      reverseButtons: true,
      focusConfirm: false,
      didOpen: function () {
        var first = box.querySelector('input:not([type=checkbox])');
        if (first) { first.focus(); }
      },
      preConfirm: function () {
        var values = {};
        Object.keys(inputs).forEach(function (name) {
          values[name] = inputs[name].type === 'checkbox' ? inputs[name].checked : inputs[name].value;
        });
        var problem = opts.validate ? opts.validate(values) : null;
        if (problem) { Swal.showValidationMessage(problem); return false; }
        return values;
      }
    }).then(function (result) { return result.isConfirmed ? result.value : null; });
  }

  // "Aguarde" enquanto uma operação está em andamento; close() fecha.
  function busy(title) {
    if (!Swal) { return { close: function () {} }; }
    Swal.fire({ title: title, allowOutsideClick: false, allowEscapeKey: false, showConfirmButton: false,
      didOpen: function () { Swal.showLoading(); } });
    return { close: function () { Swal.close(); } };
  }

  global.PlannerUI = { confirm: confirm, notify: notify, toast: toast, form: form, busy: busy };
})(window);
