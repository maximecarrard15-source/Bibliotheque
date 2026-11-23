(function () {
  'use strict';
  const App = (window.App = window.App || {});
  const U = App.util;

  App.UI = (function () {
    let currentClose = null;

    function modalRoot() { return document.getElementById('modal-root'); }

    function openModal(panel, opts) {
      opts = opts || {};
      if (currentClose) currentClose();
      const frame = U.el('div', { class: 'modal-frame' });
      const dlg = U.el('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': opts.label || 'Fenêtre' }, panel);
      const backdrop = U.el('div', { class: 'modal-backdrop', role: 'presentation' }, frame);
      backdrop.append(dlg);

      function close() {
        backdrop.remove();
        document.removeEventListener('keydown', onKey);
        currentClose = null;
        if (opts.onClose) opts.onClose();
      }
      function onKey(e) {
        if (e.key === 'Escape') {
          e.stopPropagation();
          close();
        }
      }
      backdrop.addEventListener('mousedown', (e) => {
        if (e.target === backdrop) close();
      });
      document.addEventListener('keydown', onKey);
      modalRoot().append(backdrop);
      currentClose = close;
      requestAnimationFrame(() => backdrop.classList.add('open'));
      const focusable = panel.querySelector('input, select, textarea, button');
      if (focusable) focusable.focus();
      return close;
    }

    function closeModal() {
      if (currentClose) currentClose();
    }

    function toast(message, type) {
      const zone = document.getElementById('toast-zone');
      const t = U.el('div', { class: 'toast ' + (type || 'success') }, [
        U.el('span', { class: 'toast-dot' }),
        U.el('span', null, message),
      ]);
      zone.append(t);
      requestAnimationFrame(() => t.classList.add('show'));
      setTimeout(() => {
        t.classList.remove('show');
        setTimeout(() => t.remove(), 350);
      }, 3400);
    }

    function confirm(opts) {
      opts = opts || {};
      return new Promise((resolve) => {
        let done = false;
        const panel = U.el('div', { class: 'modal-panel confirm-panel' }, [
          U.el('h3', null, opts.title || 'Confirmer'),
          U.el('p', { class: 'confirm-message' }, opts.message || ''),
          U.el('div', { class: 'modal-actions' }, [
            U.el('button', { class: 'btn ghost', type: 'button', onclick: () => finish(false) }, opts.cancelLabel || 'Annuler'),
            U.el('button', { class: 'btn ' + (opts.danger ? 'danger' : 'primary'), type: 'button', onclick: () => finish(true) }, opts.confirmLabel || 'Confirmer'),
          ]),
        ]);
        const close = openModal(panel, { label: opts.title || 'Confirmer' });
        function finish(val) {
          if (done) return;
          done = true;
          resolve(val);
          close();
        }
      });
    }

    return { openModal, closeModal, toast, confirm };
  })();
})();
