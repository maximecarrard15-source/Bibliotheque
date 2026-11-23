(function () {
  'use strict';
  const App = (window.App = window.App || {});
  const U = App.util;

  App.Views = App.Views || {};

  App.Views.search = function (q) {
    const Sref = App.Store;
    const results = Sref.searchBooks(q);
    const root = U.el('section', { class: 'view-section fade-in' });

    root.append(U.el('div', { class: 'page-head' }, [
      U.el('div', null, [
        U.el('span', { class: 'breadcrumb' }, [U.el('a', { href: '#/' }, '← Tableau de bord')]),
        U.el('h1', null, 'Recherche'),
        U.el('p', { class: 'page-sub' }, q
          ? 'Résultats pour « ' + q + ' » — ' + U.plural(results.length, 'livre trouvé', 'livres trouvés') + ' (titre, auteur, genre, type ou bibliothèque).'
          : 'Saisissez un terme dans la barre de recherche ci-dessus.'),
      ]),
    ]));

    if (!q) return root;

    if (!results.length) {
      root.append(U.el('div', { class: 'empty-state card' }, [
        U.el('div', { class: 'empty-emoji' }, '🔍'),
        U.el('h2', null, 'Aucun résultat'),
        U.el('p', null, 'Aucun livre ne correspond à « ' + q + ' ». Essayez un autre mot-clé.'),
      ]));
      return root;
    }

    const rows = results.map((b) => {
      const lib = b.libraryId ? Sref.getLibrary(b.libraryId) : null;
      return U.el('div', { class: 'book-list-row', onclick: () => App.Modals.bookCard(b.id) }, [
        U.el('div', { class: 'bl-title' }, [
          U.el('strong', null, b.title),
          U.el('small', null, b.author || ''),
        ]),
        U.el('div', { class: 'bl-tags' }, [App.Modals.chip(b.genre), App.Modals.chip(b.type)]),
        U.el('div', { class: 'bl-status' }, [App.Modals.statusBadge(b.status)]),
        U.el('div', { class: 'bl-loc' }, [
          U.el('span', null, lib ? lib.name : '—'),
          U.el('small', null, (lib && (b.row || b.col)) ? U.lineCol(b.row, b.col) : (lib ? '' : 'Aucun emplacement')),
        ]),
      ]);
    });

    root.append(U.el('div', { class: 'card table-card' }, [U.el('div', { class: 'table-scroll' }, rows)]));
    return root;
  };
})();
