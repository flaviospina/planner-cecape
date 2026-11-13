// assets/js/admin.js
// Páginas administrativas em PHP: pede confirmação (SweetAlert) antes de enviar cada formulário
// e mostra em destaque a mensagem de resultado da ação anterior.
(function (global) {
  'use strict';

  var UI = global.PlannerUI;
  var MIN_PASSWORD = 8;

  document.querySelectorAll('form[data-confirm-title], form[data-prompt-password]').forEach(function (form) {
    form.addEventListener('submit', function (event) {
      if (form.dataset.confirmed === '1') { return; }
      event.preventDefault();
      if (!form.reportValidity()) { return; }

      var ask;
      if (form.dataset.promptPassword) {
        ask = UI.form({
          title: form.dataset.promptPassword,
          text: 'A pessoa entrará com esta senha e precisará trocá-la no próximo acesso.',
          confirmText: form.dataset.confirmButton,
          fields: [{ name: 'password', label: 'Senha provisória', type: 'text', maxLength: 200 }],
          validate: function (v) {
            return v.password.length < MIN_PASSWORD ? 'A senha precisa ter pelo menos ' + MIN_PASSWORD + ' caracteres.' : null;
          }
        }).then(function (values) {
          if (!values) { return false; }
          form.elements.password.value = values.password;
          return true;
        });
      } else {
        ask = UI.confirm({
          title: form.dataset.confirmTitle,
          text: form.dataset.confirmText,
          confirmText: form.dataset.confirmButton,
          danger: form.dataset.confirmDanger === '1'
        });
      }
      ask.then(function (ok) {
        if (ok) {
          form.dataset.confirmed = '1';
          form.submit();
        }
      });
    });
  });

  var flash = document.querySelector('[data-flash]');
  if (flash) {
    UI.toast(flash.getAttribute('data-flash') === 'ok' ? 'success' : 'error', flash.textContent);
  }
})(window);
