(function () {
  'use strict';
  const App = (window.App = window.App || {});

  App.util = {
    uid() {
      if (window.crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
      return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
    },
    esc(str) {
      return String(str).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      }[c]));
    },
    el(tag, attrs, children) {
      const node = document.createElement(tag);
      if (attrs) {
        for (const [k, v] of Object.entries(attrs)) {
          if (v == null || v === false) continue;
          if (k === 'class') node.className = v;
          else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
          else if (k === 'dataset') Object.assign(node.dataset, v);
          else node.setAttribute(k, v === true ? '' : v);
        }
      }
      if (children != null) {
        if (!Array.isArray(children)) children = [children];
        for (const child of children) {
          if (child == null || child === false) continue;
          node.append(child.nodeType ? child : document.createTextNode(String(child)));
        }
      }
      return node;
    },
    debounce(fn, ms) {
      let t = null;
      return function (...args) {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), ms);
      };
    },
    plural(n, one, many) {
      return n + ' ' + (n > 1 ? (many || one + 's') : one);
    },
    clampInt(v, min, max, fallback) {
      const n = parseInt(v, 10);
      if (Number.isNaN(n)) return fallback;
      return Math.min(max, Math.max(min, n));
    },
    intOrNull(v) {
      const n = parseInt(v, 10);
      return Number.isNaN(n) ? null : n;
    },
    lineCol(row, col) {
      return 'Ligne ' + row + ' · Colonne ' + col;
    },
    spineClass(text) {
      let h = 0;
      const s = String(text || '');
      for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
      return 'spine-' + (h % 8);
    },
    truncate(s, n) {
      s = String(s || '');
      return s.length > n ? s.slice(0, n - 1) + '…' : s;
    },
    formatDate(iso) {
      try {
        return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
      } catch (e) { return ''; }
    },
  };
})();
