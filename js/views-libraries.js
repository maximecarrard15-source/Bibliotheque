(function () {
  'use strict';
  const App = (window.App = window.App || {});
  const U = App.util;

  App.Views = App.Views || {};

  App.Views.libraryList = function () {
    const Sref = App.Store;
    const libraries = Sref.listLibraries();
    const root = U.el('section', { class: 'view-section fade-in' });

    root.append(U.el('div', { class: 'page-head' }, [
      U.el('div', null, [
        U.el('h1', null, 'Mes bibliothèques'),
        U.el('p', { class: 'page-sub' }, 'Configurez chaque bibliothèque physique : nom, dimensions et apparence.'),
      ]),
      U.el('div', { class: 'head-actions' }, [
        U.el('button', { class: 'btn primary', onclick: () => App.Modals.libraryForm(null) }, '+ Nouvelle bibliothèque'),
      ]),
    ]));

    if (!libraries.length) {
      root.append(U.el('div', { class: 'empty-state card' }, [
        U.el('div', { class: 'empty-emoji' }, '🪵'),
        U.el('h2', null, 'Aucune bibliothèque pour l\'instant'),
        U.el('p', null, 'Créez votre première bibliothèque pour visualiser vos cases et y ranger vos livres.'),
        U.el('div', { class: 'empty-actions' }, [
          U.el('button', { class: 'btn primary', onclick: () => App.Modals.libraryForm(null) }, 'Créer une bibliothèque'),
        ]),
      ]));
      return root;
    }

    const grid = U.el('div', { class: 'lib-grid' });
    libraries.forEach((lib) => {
      const st = Sref.libraryStats(lib.id);
      grid.append(U.el('div', { class: 'card lib-card' }, [
        U.el('div', { class: 'lib-card-head' }, [
          U.el('div', null, [
            U.el('h3', { class: 'lib-name' }, lib.name),
            U.el('small', { class: 'lib-sub' }, lib.rows + ' × ' + lib.cols + ' cases · ' + Sref.themeName(lib.theme)),
          ]),
        ]),
        App.grid.render(lib, { compact: true, onBookClick: (b, books) => (books.length > 1
          ? App.Modals.slotMenu(lib.id, b.row, b.col)
          : App.Modals.bookCard(b.id)) }),
        U.el('div', { class: 'lib-card-foot' }, [
          U.el('span', null, U.plural(App.Store.booksInLibrary(lib.id).length, 'livre rangé', 'livres rangés') + ' · ' + st.free + ' libre' + (st.free > 1 ? 's' : '')),
        ]),
        U.el('div', { class: 'occupancy-bar' }, [U.el('div', {
          class: 'occupancy-fill',
          style: 'width:' + Math.round((st.capacity ? st.occupied / st.capacity : 0) * 100) + '%',
        })]),
        U.el('div', { class: 'lib-card-actions' }, [
          U.el('a', { class: 'btn primary small', href: '#/bibliotheque/' + lib.id }, 'Ouvrir'),
          U.el('button', { class: 'btn ghost small', onclick: () => App.Modals.libraryForm(lib) }, 'Modifier'),
          U.el('button', { class: 'btn danger-ghost small', onclick: () => remove(lib) }, 'Supprimer'),
        ]),
      ]));
    });
    root.append(grid);
    return root;
  };

  function remove(lib) {
    const st = App.Store.libraryStats(lib.id);
    App.UI.confirm({
      title: 'Supprimer cette bibliothèque',
      message: 'Supprimer « ' + lib.name + ' » ?'
        + (st.occupied > 0
          ? ' Attention : ' + U.plural(st.occupied, 'livre rangé', 'livres rangés') + ' à l\'intérieur passeront au statut « Sorti » et perdront leur emplacement.'
          : ' Cette bibliothèque est vide.')
        + ' Cette action est irréversible.',
      confirmLabel: 'Supprimer',
      danger: true,
    }).then((ok) => {
      if (!ok) return;
      const res = App.Store.deleteLibrary(lib.id);
      if (res.ok) App.UI.toast('Bibliothèque « ' + lib.name + ' » supprimée.');
      if (location.hash.indexOf('#/bibliotheque/' + lib.id) === 0) location.hash = '#/bibliotheques';
    });
  }

  App.Views.removeLibraryConfirm = remove;

  App.Views.libraryDetail = function (id) {
    const Sref = App.Store;
    const lib = Sref.getLibrary(id);
    const root = U.el('section', { class: 'view-section fade-in' });

    if (!lib) {
      root.append(U.el('div', { class: 'empty-state card' }, [
        U.el('div', { class: 'empty-emoji' }, '🤔'),
        U.el('h2', null, 'Bibliothèque introuvable'),
        U.el('p', null, 'Elle a peut-être été supprimée.'),
        U.el('div', { class: 'empty-actions' }, [
          U.el('a', { class: 'btn primary', href: '#/bibliotheques' }, 'Retour aux bibliothèques'),
        ]),
      ]));
      return root;
    }

    const st = Sref.libraryStats(lib.id);
    root.append(U.el('div', { class: 'page-head' }, [
      U.el('div', null, [
        U.el('span', { class: 'breadcrumb' }, [U.el('a', { href: '#/bibliotheques' }, '← Toutes les bibliothèques')]),
        U.el('h1', null, lib.name),
        U.el('div', { class: 'badge-row' }, [
          U.el('span', { class: 'chip' }, lib.rows + ' × ' + lib.cols + ' cases'),
          U.el('span', { class: 'chip' }, Sref.themeName(lib.theme)),
          U.el('span', { class: 'chip' }, U.plural(st.occupied, 'livre rangé', 'livres rangés')),
          U.el('span', { class: 'chip' }, U.plural(st.free, 'case libre', 'cases libres')),
        ]),
      ]),
      U.el('div', { class: 'head-actions' }, [
        U.el('button', { class: 'btn ghost', onclick: () => App.Modals.libraryForm(lib) }, 'Modifier la configuration'),
        U.el('button', { class: 'btn danger-ghost', onclick: () => App.Views.removeLibraryConfirm(lib) }, 'Supprimer'),
      ]),
    ]));

    root.append(U.el('p', { class: 'hint-line' }, 'Cliquez sur un casier pour voir les livres qui s\'y trouvent et/ou ranger un livre sorti — une même case peut accueillir plusieurs livres.'));

    root.append(U.el('div', { class: 'card shelf-card' }, [
      App.grid.render(lib, {
        onBookClick: (b, books) => (books.length > 1
          ? App.Modals.slotMenu(lib.id, b.row, b.col)
          : App.Modals.bookCard(b.id)),
        onEmptyClick: (r, c) => App.Modals.slotMenu(lib.id, r, c),
      }),
      App.grid.legend(),
    ]));

    return root;
  };
})();
