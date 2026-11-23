(function () {
  'use strict';
  const App = (window.App = window.App || {});
  const U = App.util;

  App.grid = (function () {

    function render(lib, opts) {
      opts = opts || {};
      const bySlot = new Map();
      if (lib) {
        App.Store.booksInLibrary(lib.id).forEach((b) => bySlot.set(b.row + ':' + b.col, b));
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
          shelf.append(makeSlot(bySlot.get(r + ':' + c), r, c, opts));
        }
      }
      return shelf;
    }

    function makeSlot(book, r, c, opts) {
      if (book) {
        const cls = 'slot occupied '
          + U.spineClass(book.title)
          + (opts.currentBookId === book.id ? ' current' : '')
          + (opts.onBookClick ? ' clickable' : '');
        return U.el('div', {
          class: cls,
          dataset: { row: String(r), col: String(c) },
          title: book.title + (book.author ? ' — ' + book.author : ''),
          onclick: opts.onBookClick ? function () { opts.onBookClick(book); } : null,
        }, [
          U.el('span', { class: 'slot-title' }, U.truncate(book.title, 24)),
          U.el('span', { class: 'slot-author' }, book.author ? U.truncate(book.author, 20) : ''),
        ]);
      }

      const cls = 'slot empty'
        + (opts.selectable ? ' selectable' : '')
        + (opts.onEmptyClick ? ' clickable' : '');
      return U.el('div', {
        class: cls,
        dataset: { row: String(r), col: String(c) },
        title: opts.selectable
          ? 'Placer ici — ' + U.lineCol(r, c)
          : 'Case libre — ' + U.lineCol(r, c),
        onclick: opts.selectable
          ? function () { if (opts.onSlotClick) opts.onSlotClick(r, c); }
          : (opts.onEmptyClick ? function () { opts.onEmptyClick(r, c); } : null),
      }, [U.el('span', { class: 'slot-plus', 'aria-hidden': 'true' }, '+')]);
    }

    function legend(opts) {
      opts = opts || {};
      const items = [
        U.el('span', { class: 'legend-item' }, [U.el('i', { class: 'legend-dot occupied' }), 'Livre rangé']),
        U.el('span', { class: 'legend-item' }, [U.el('i', { class: 'legend-dot empty' }), 'Case libre']),
      ];
      if (opts.selectable) {
        items.push(U.el('span', { class: 'legend-item' }, [U.el('i', { class: 'legend-dot selectable' }), 'Case disponible pour ranger']));
      }
      return U.el('div', { class: 'shelf-legend' }, items);
    }

    return { render, legend };
  })();
})();
