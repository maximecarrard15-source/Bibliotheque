(function () {
  'use strict';
  const App = (window.App = window.App || {});
  const U = App.util;

  App.Views = App.Views || {};

  App.Views.dashboard = function () {
    const Sref = App.Store;
    const stats = Sref.globalStats();
    const libraries = Sref.listLibraries();
    const outBooks = Sref.listBooks({ status: 'out' })
      .sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1));

    const root = U.el('section', { class: 'view-section fade-in' });

    const head = U.el('div', { class: 'page-head' }, [
      U.el('div', null, [
        U.el('h1', null, 'Tableau de bord'),
        U.el('p', { class: 'page-sub' }, 'Vue d\'ensemble de toutes vos bibliothèques.'),
      ]),
      U.el('div', { class: 'head-actions' }, [
        U.el('button', { class: 'btn primary', onclick: () => App.Modals.bookForm(null) }, '+ Ajouter un livre'),
        (!libraries.length) ? U.el('button', { class: 'btn ghost', onclick: () => App.Modals.libraryForm(null) }, '+ Nouvelle bibliothèque') : null,
      ]),
    ]);
    root.append(head);

    root.append(U.el('div', { class: 'stats-grid' }, [
      statCard('📚', 'Total de livres', String(stats.total), 'dans votre collection'),
      statCard('✅', 'Livres rangés', String(stats.inLibrary), 'présents en rayon'),
      statCard('📤', 'Livres sortis', String(stats.out), 'à ranger plus tard'),
      statCard('🗄️', 'Cases occupées', stats.occupied + ' / ' + stats.capacity, U.plural(stats.available, 'case disponible', 'cases disponibles')),
    ]));

    if (!libraries.length && !stats.total) {
      root.append(U.el('div', { class: 'empty-state card' }, [
        U.el('div', { class: 'empty-emoji' }, '🏛️'),
        U.el('h2', null, 'Bienvenue dans votre bibliothèque numérique'),
        U.el('p', null, 'Commencez par créer votre première bibliothèque (nombre de lignes, colonnes, apparence), puis ajoutez vos livres et rangez-les en cliquant sur une case.'),
        U.el('div', { class: 'empty-actions' }, [
          U.el('button', { class: 'btn primary', onclick: () => App.Modals.libraryForm(null) }, 'Créer ma bibliothèque'),
          U.el('button', { class: 'btn ghost', onclick: () => {
            const res = App.Store.seedDemo();
            if (res.ok) App.UI.toast('Données d\'exemple chargées — supprimez-les librement.');
          } }, 'Voir avec des données d\'exemple'),
        ]),
      ]));
      return root;
    }

    if (outBooks.length) {
      const list = U.el('div', { class: 'out-list' });
      outBooks.forEach((b) => {
        const lib = b.libraryId ? Sref.getLibrary(b.libraryId) : null;
        list.append(U.el('div', { class: 'out-row' }, [
          U.el('button', { class: 'out-info', title: 'Ouvrir la fiche', onclick: () => App.Modals.bookCard(b.id) }, [
            U.el('strong', null, b.title),
            U.el('small', null, (b.author || 'Auteur inconnu') + (lib ? '  ·  dernier emplacement : ' + U.lineCol(b.row, b.col) + ' (' + lib.name + ')' : '')),
          ]),
          U.el('button', { class: 'btn small primary', onclick: () => App.Modals.placeBook(b.id, 'shelve') }, '📥 Ranger'),
        ]));
      });
      root.append(U.el('div', { class: 'card section-card' }, [
        U.el('div', { class: 'section-card-head' }, [
          U.el('h2', null, '📤 Livres sortis à ranger'),
          U.el('span', { class: 'section-count' }, U.plural(outBooks.length, 'livre', 'livres')),
        ]),
        list,
      ]));
    }

    if (libraries.length) {
      const libsWrap = U.el('div', { class: 'lib-grid' });
      libraries.forEach((lib) => {
        const st = Sref.libraryStats(lib.id);
        const cardEl = U.el('div', { class: 'card lib-card' }, [
          U.el('div', { class: 'lib-card-head' }, [
            U.el('div', null, [
              U.el('h3', { class: 'lib-name' }, lib.name),
              U.el('small', { class: 'lib-sub' }, lib.rows + ' × ' + lib.cols + ' cases · ' + App.Store.themeName(lib.theme)),
            ]),
            U.el('a', { class: 'btn ghost small', href: '#/bibliotheque/' + lib.id }, 'Gérer'),
          ]),
          App.grid.render(lib, { compact: true, onBookClick: (b) => App.Modals.bookCard(b.id) }),
          U.el('div', { class: 'lib-card-foot' }, [
            U.el('span', null, U.plural(st.occupied, 'livre rangé', 'livres rangés')),
            U.el('span', { class: 'muted' }, st.free + ' case' + (st.free > 1 ? 's' : '') + ' libre' + (st.free > 1 ? 's' : '')),
          ]),
          U.el('div', { class: 'occupancy-bar' }, [U.el('div', {
            class: 'occupancy-fill',
            style: 'width:' + Math.round((st.capacity ? st.occupied / st.capacity : 0) * 100) + '%',
          })]),
        ]);
        libsWrap.append(cardEl);
      });
      root.append(U.el('div', { class: 'card section-card' }, [
        U.el('div', { class: 'section-card-head' }, [
          U.el('h2', null, '🏛️ Mes bibliothèques'),
          U.el('a', { class: 'btn ghost small', href: '#/bibliotheques' }, 'Tout voir'),
        ]),
        libsWrap,
      ]));
    }

    const recent = App.Store.listBooks()
      .slice()
      .sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1))
      .slice(0, 6);
    if (recent.length) {
      const wrap = U.el('div', { class: 'recent-grid' });
      recent.forEach((b) => {
        wrap.append(U.el('button', { class: 'recent-card card', onclick: () => App.Modals.bookCard(b.id) }, [
          U.el('div', { class: 'recent-top' }, [App.Modals.statusBadge(b.status)]),
          U.el('strong', null, U.truncate(b.title, 40)),
          U.el('small', null, b.author || 'Auteur inconnu'),
        ]));
      });
      root.append(U.el('div', { class: 'card section-card' }, [
        U.el('div', { class: 'section-card-head' }, [
          U.el('h2', null, '🕒 Dernières activités'),
          U.el('a', { class: 'btn ghost small', href: '#/livres' }, 'Toute la collection'),
        ]),
        wrap,
      ]));
    }

    return root;
  };

  function statCard(icon, label, value, sub) {
    return U.el('div', { class: 'card stat-card' }, [
      U.el('span', { class: 'stat-icon' }, icon),
      U.el('div', { class: 'stat-text' }, [
        U.el('span', { class: 'stat-value' }, value),
        U.el('span', { class: 'stat-label' }, label),
        U.el('small', { class: 'stat-sub' }, sub),
      ]),
    ]);
  }
})();
