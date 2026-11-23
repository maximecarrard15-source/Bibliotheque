(function () {
  'use strict';
  const App = (window.App = window.App || {});
  const U = App.util;

  App.grid = (function () {

    function render(lib, opts) {
      opts = opts || {};
      const bySlot = new Map();
      if (lib) {
        App.Store.booksInLibrary(lib.id).forEach((b) => {
          const key = b.row + ':' + b.col;
          if (!bySlot.has(key)) bySlot.set(key, []);
          bySlot.get(key).push(b);
        });
      }
      const rows = lib ? lib.rows : 0;
      const cols = lib ? lib.cols : 0;

      const shelf = U.el('div', {
        class: 'shelf theme-' + (lib ? lib.theme : 'walnut') + (opts.compact ? ' compact' : ''),
        style: '--cols:' + cols,
        role: 'grid',
        'aria-label': lib ? 'Grille de la bibliothèque ' + lib.name : '',
      });

      for (let r = 1; r <= rows; r++) {
        for (let c = 1; c <= cols; c++) {
          shelf.append(makeSlot(bySlot.get(r + ':' + c) || [], r, c, opts));
        }
      }
      return shelf;
    }

    function makeSlot(books, r, c, opts) {
      const first = books[0] || null;
      const extra = books.length - 1;
      const containsCurrent = opts.currentBookId && books.some((b) => b.id === opts.currentBookId);

      let cls = 'slot ' + (first ? 'occupied ' + U.spineClass(first.title) : 'empty');
      if (extra > 0) cls += ' stacked';
      if (containsCurrent) cls += ' current';

      let title = '';
      if (books.length === 1) {
        title = first.title + (first.author ? ' — ' + first.author : '');
      } else if (books.length > 1) {
        title = books.length + ' livres dans cette case :\n' + books.map((b) => '• ' + b.title).join('\n');
      }

      if (opts.selectable) {
        cls += ' selectable' + (first ? ' selectable-occupied' : '');
        title = title
          ? 'Ajouter ici — ' + U.lineCol(r, c) + ' (' + title + ')'
          : 'Placer ici — ' + U.lineCol(r, c);
        return U.el('div', {
          class: cls,
          dataset: { row: String(r), col: String(c) },
          title: title,
          onclick: function () {
            if (opts.onSlotClick) opts.onSlotClick(r, c, books.length);
          },
        }, first ? slotContent(first, extra) : [U.el('span', { class: 'slot-plus', 'aria-hidden': 'true' }, '+')]);
      }

      if (first) {
        if (opts.onBookClick) cls += ' clickable';
        return U.el('div', {
          class: cls,
          dataset: { row: String(r), col: String(c) },
          title: title,
          onclick: opts.onBookClick ? function () { opts.onBookClick(first, books); } : null,
        }, slotContent(first, extra));
      }

      if (opts.onEmptyClick) cls += ' clickable';
      return U.el('div', {
        class: cls,
        dataset: { row: String(r), col: String(c) },
        title: 'Case libre — ' + U.lineCol(r, c),
        onclick: opts.onEmptyClick ? function () { opts.onEmptyClick(r, c); } : null,
      }, [U.el('span', { class: 'slot-plus', 'aria-hidden': 'true' }, '+')]);
    }

    function slotContent(first, extra) {
      const children = [
        U.el('span', { class: 'slot-title' }, U.truncate(first.title, 24)),
        U.el('span', { class: 'slot-author' }, first.author ? U.truncate(first.author, 20) : ''),
      ];
      if (extra > 0) {
        children.push(U.el('span', { class: 'slot-count-badge', title: '+' + extra + ' autre(s) livre(s) dans cette case' }, '+' + extra));
      }
      return children;
    }

    function legend(opts) {
      opts = opts || {};
      const items = [
        U.el('span', { class: 'legend-item' }, [U.el('i', { class: 'legend-dot occupied' }), 'Livre(s) rangé(s)']),
        U.el('span', { class: 'legend-item' }, [U.el('i', { class: 'legend-dot empty' }), 'Case libre']),
      ];
      if (opts.selectable) {
        items.push(U.el('span', { class: 'legend-item' }, [U.el('i', { class: 'legend-dot selectable' }), 'Cliquez pour ranger ici']));
      }
      items.push(U.el('span', { class: 'legend-item' }, [U.el('i', { class: 'legend-dot stacked' }), 'Plusieurs livres dans la case']));
      return U.el('div', { class: 'shelf-legend' }, items);
    }

    return { render, legend };
  })();
})();
