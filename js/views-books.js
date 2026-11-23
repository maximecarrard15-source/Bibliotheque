(function () {
  'use strict';
  const App = (window.App = window.App || {});
  const U = App.util;

  App.Views = App.Views || {};

  const uiState = {
    viewMode: 'grid',
    genre: '',
    type: '',
    status: '',
    sort: 'title',
    text: '',
  };

  App.Views.books = function () {
    const Sref = App.Store;
    const root = U.el('section', { class: 'view-section fade-in' });

    root.append(U.el('div', { class: 'page-head' }, [
      U.el('div', null, [
        U.el('h1', null, 'Ma collection'),
        U.el('p', { class: 'page-sub' }, 'Tous vos livres, toutes bibliothèques confondues.'),
      ]),
      U.el('div', { class: 'head-actions' }, [
        U.el('button', { class: 'btn primary', onclick: () => App.Modals.bookForm(null) }, '+ Ajouter un livre'),
      ]),
    ]));

    const textIn = U.el('input', {
      type: 'search', class: 'filter-text', placeholder: 'Filtrer par titre ou auteur…', value: uiState.text,
      oninput: U.debounce(() => { uiState.text = textIn.value; renderList(); }, 150),
    });
    const genreSel = selectControl('Genre', Sref.listGenres(), uiState.genre, (v) => { uiState.genre = v; renderList(); });
    const typeSel = selectControl('Type', Sref.listTypes(), uiState.type, (v) => { uiState.type = v; renderList(); });
    const statusSel = selectControl('Statut', ['Dans la bibliothèque', 'Sorti'], uiState.status, (v) => { uiState.status = v; renderList(); });
    const sortSel = U.el('select', { 'aria-label': 'Trier' }, [
      U.el('option', { value: 'title' }, 'Trier : Titre A→Z'),
      U.el('option', { value: 'author' }, 'Trier : Auteur'),
      U.el('option', { value: 'recent' }, 'Trier : Modifiés récemment'),
    ]);
    sortSel.value = uiState.sort;
    sortSel.addEventListener('change', () => { uiState.sort = sortSel.value; renderList(); });

    const gridBtn = U.el('button', { class: 'view-toggle-btn' + (uiState.viewMode === 'grid' ? ' active' : ''), title: 'Vue grille', type: 'button', onclick: () => { uiState.viewMode = 'grid'; syncToggle(); renderList(); } }, '▦');
    const listBtn = U.el('button', { class: 'view-toggle-btn' + (uiState.viewMode === 'list' ? ' active' : ''), title: 'Vue liste', type: 'button', onclick: () => { uiState.viewMode = 'list'; syncToggle(); renderList(); } }, '☰');
    function syncToggle() {
      gridBtn.classList.toggle('active', uiState.viewMode === 'grid');
      listBtn.classList.toggle('active', uiState.viewMode === 'list');
    }

    root.append(U.el('div', { class: 'card toolbar' }, [
      textIn,
      genreSel,
      typeSel,
      statusSel,
      sortSel,
      U.el('div', { class: 'view-toggle' }, [gridBtn, listBtn]),
    ]));

    const countLine = U.el('span', { class: 'section-count' });
    const listHost = U.el('div');
    root.append(U.el('div', { class: 'list-meta' }, [countLine]), listHost);

    function getFiltered() {
      let books = Sref.listBooks();
      if (uiState.status === 'Dans la bibliothèque') books = books.filter((b) => b.status === 'in');
      if (uiState.status === 'Sorti') books = books.filter((b) => b.status === 'out');
      if (uiState.genre) books = books.filter((b) => (b.genre || '').toLowerCase() === uiState.genre.toLowerCase());
      if (uiState.type) books = books.filter((b) => (b.type || '').toLowerCase() === uiState.type.toLowerCase());
      if (uiState.text.trim()) {
        const t = uiState.text.trim().toLowerCase();
        books = books.filter((b) => b.title.toLowerCase().includes(t) || b.author.toLowerCase().includes(t));
      }
      if (uiState.sort === 'author') {
        books.sort((a, b) => (a.author || 'zz').localeCompare(b.author || 'zz', 'fr') || a.title.localeCompare(b.title, 'fr'));
      } else if (uiState.sort === 'recent') {
        books.sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1));
      } else {
        books.sort((a, b) => a.title.localeCompare(b.title, 'fr'));
      }
      return books;
    }

    function locationLine(b) {
      const lib = b.libraryId ? Sref.getLibrary(b.libraryId) : null;
      if (b.status === 'in' && lib) return lib.name + ' — ' + U.lineCol(b.row, b.col);
      if (lib) return 'Dernier emplacement : ' + lib.name + ' — ' + U.lineCol(b.row, b.col);
      return 'Non rangé';
    }

    function bookRowEl(b) {
      return U.el('div', { class: 'book-list-row', onclick: () => App.Modals.bookCard(b.id) }, [
        U.el('div', { class: 'bl-title' }, [U.el('strong', null, b.title), U.el('small', null, b.author || '')]),
        U.el('div', { class: 'bl-tags' }, [App.Modals.chip(b.genre), App.Modals.chip(b.type)]),
        U.el('div', { class: 'bl-status' }, [App.Modals.statusBadge(b.status)]),
        U.el('div', { class: 'bl-loc' }, locationLine(b)),
      ]);
    }

    function bookCardEl(b) {
      return U.el('div', { class: 'book-card-item card' }, [
        U.el('button', { class: 'book-card-hit', type: 'button', onclick: () => App.Modals.bookCard(b.id) }, [
          U.el('div', { class: 'recent-top' }, [App.Modals.statusBadge(b.status)]),
          U.el('strong', null, U.truncate(b.title, 44)),
          U.el('small', null, b.author || 'Auteur inconnu'),
          U.el('div', { class: 'badge-row' }, [App.Modals.chip(b.genre), App.Modals.chip(b.type)]),
          U.el('small', { class: 'book-loc' }, '📍 ' + locationLine(b)),
        ]),
      ]);
    }

    function renderList() {
      const books = getFiltered();
      countLine.textContent = U.plural(books.length, 'livre trouvé', 'livres trouvés');
      listHost.innerHTML = '';

      if (!Sref.listBooks().length) {
        listHost.append(U.el('div', { class: 'empty-state card' }, [
          U.el('div', { class: 'empty-emoji' }, '📖'),
          U.el('h2', null, 'Votre collection est vide'),
          U.el('p', null, 'Ajoutez votre premier livre pour commencer à remplir vos étagères.'),
          U.el('div', { class: 'empty-actions' }, [
            U.el('button', { class: 'btn primary', type: 'button', onclick: () => App.Modals.bookForm(null) }, '+ Ajouter un livre'),
          ]),
        ]));
        return;
      }

      if (!books.length) {
        listHost.append(U.el('div', { class: 'empty-state card' }, [
          U.el('div', { class: 'empty-emoji' }, '🔍'),
          U.el('h2', null, 'Aucun livre ne correspond à ces filtres'),
          U.el('div', { class: 'empty-actions' }, [
            U.el('button', { class: 'btn ghost', type: 'button', onclick: () => {
              uiState.text = ''; uiState.genre = ''; uiState.type = ''; uiState.status = '';
              textIn.value = ''; genreSel.value = ''; typeSel.value = ''; statusSel.value = '';
              renderList();
            } }, 'Réinitialiser les filtres'),
          ]),
        ]));
        return;
      }

      if (uiState.viewMode === 'list') {
        listHost.append(U.el('div', { class: 'card table-card' }, [U.el('div', { class: 'table-scroll' }, books.map(bookRowEl))]));
      } else {
        const grid = U.el('div', { class: 'books-grid' });
        books.forEach((b) => grid.append(bookCardEl(b)));
        listHost.append(grid);
      }
    }

    renderList();
    return root;
  };

  function selectControl(label, options, current, onChange) {
    const sel = U.el('select', { 'aria-label': label }, [U.el('option', { value: '' }, label + ' : tous')]);
    options.forEach((o) => sel.append(U.el('option', { value: o }, o)));
    sel.value = current;
    sel.addEventListener('change', () => onChange(sel.value));
    return sel;
  }
})();
