(function () {
  'use strict';
  const App = (window.App = window.App || {});
  const U = App.util;

  const STORAGE_KEY = 'bibliotheque-app:v1';

  const MIN_DIM = 1;
  const MAX_DIM = 12;

  App.Store = (function () {
    const GENRES = [
      'Fantasy', 'Policier', 'Science-fiction', 'Histoire', 'Romance',
      'Aventure', 'Jeunesse', 'Documentaire', 'Essai', 'Autre'
    ];
    const TYPES = [
      'Roman', 'BD', 'Manga', 'Documentaire', 'Essai',
      'Biographie', 'Nouvelle', 'Poésie', 'Autre'
    ];
    const THEMES = [
      { id: 'walnut', name: 'Noyer' },
      { id: 'oak', name: 'Chêne clair' },
      { id: 'sage', name: 'Vert sauge' },
      { id: 'slate', name: 'Ardoise' },
      { id: 'midnight', name: 'Nuit' },
    ];

    let state = load();
    const listeners = new Set();

    function nowISO() { return new Date().toISOString(); }

    function uid() { return U.uid(); }

    function load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { version: 1, libraries: [], books: [] };
        return normalize(JSON.parse(raw));
      } catch (e) {
        console.error('Impossible de lire les données sauvegardées :', e);
        return { version: 1, libraries: [], books: [] };
      }
    }

    function normalize(data) {
      const s = { version: 1, libraries: [], books: [] };
      if (data && Array.isArray(data.libraries)) {
        s.libraries = data.libraries.filter((l) => l && l.id).map((l) => ({
          id: String(l.id),
          name: String(l.name || 'Bibliothèque'),
          rows: U.clampInt(l.rows, MIN_DIM, MAX_DIM, 4),
          cols: U.clampInt(l.cols, MIN_DIM, MAX_DIM, 4),
          theme: THEMES.some((t) => t.id === l.theme) ? l.theme : 'walnut',
          createdAt: l.createdAt || nowISO(),
        }));
      }
      if (data && Array.isArray(data.books)) {
        s.books = data.books.map((b) => ({
          id: String(b.id),
          title: String(b.title || ''),
          author: String(b.author || ''),
          description: String(b.description || ''),
          genre: String(b.genre || ''),
          type: String(b.type || ''),
          status: b.status === 'out' ? 'out' : 'in',
          libraryId: b.libraryId ? String(b.libraryId) : null,
          row: U.intOrNull(b.row),
          col: U.intOrNull(b.col),
          createdAt: b.createdAt || nowISO(),
          updatedAt: b.updatedAt || b.createdAt || nowISO(),
        }));
      }
      return s;
    }

    function save() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (e) {
        console.error('Sauvegarde impossible :', e);
      }
      notify();
    }

    function subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    }

    function notify() {
      listeners.forEach((fn) => {
        try { fn(); } catch (e) { console.error(e); }
      });
    }

    /* ---------- Accès ---------- */

    function listLibraries() {
      return state.libraries.slice().sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
    }

    function getLibrary(id) {
      return state.libraries.find((l) => l.id === id) || null;
    }

    function getBook(id) {
      return state.books.find((b) => b.id === id) || null;
    }

    function listBooks(filter) {
      let books = state.books;
      if (filter) {
        if (filter.status) books = books.filter((b) => b.status === filter.status);
        if (filter.libraryId) books = books.filter((b) => b.libraryId === filter.libraryId);
      }
      return books.slice();
    }

    function booksInLibrary(libraryId) {
      return state.books.filter((b) => b.status === 'in' && b.libraryId === libraryId);
    }

    function booksAt(libraryId, row, col) {
      return state.books.filter(
        (b) => b.status === 'in' && b.libraryId === libraryId && b.row === row && b.col === col
      );
    }

    function isSlotFree(libraryId, row, col) {
      return booksAt(libraryId, row, col).length === 0;
    }

    function occupiedSlots(libraryId) {
      const slots = new Set();
      for (const b of booksInLibrary(libraryId)) slots.add(b.row + ':' + b.col);
      return slots.size;
    }

    function searchBooks(q) {
      const t = String(q || '').trim().toLowerCase();
      if (!t) return [];
      return state.books
        .filter((b) => {
          const lib = getLibrary(b.libraryId);
          return [b.title, b.author, b.genre, b.type, lib ? lib.name : '']
            .some((f) => String(f || '').toLowerCase().includes(t));
        })
        .sort((a, b) => a.title.localeCompare(b.title, 'fr'));
    }

    function libraryStats(libraryId) {
      const lib = getLibrary(libraryId);
      if (!lib) return { capacity: 0, occupied: 0, free: 0 };
      const capacity = lib.rows * lib.cols;
      const occupied = Math.min(occupiedSlots(libraryId), capacity);
      return { capacity, occupied, free: capacity - occupied };
    }

    function globalStats() {
      const inLibrary = state.books.filter((b) => b.status === 'in').length;
      const out = state.books.filter((b) => b.status === 'out').length;
      let capacity = 0;
      let occupied = 0;
      for (const lib of state.libraries) {
        capacity += lib.rows * lib.cols;
        occupied += Math.min(occupiedSlots(lib.id), lib.rows * lib.cols);
      }
      return {
        total: state.books.length,
        inLibrary,
        out,
        capacity,
        occupied,
        available: capacity - occupied,
      };
    }

    function themeName(id) {
      const t = THEMES.find((x) => x.id === id);
      return t ? t.name : id;
    }

    /* ---------- Mutations ---------- */

    function validateBook(input) {
      const errors = {};
      const value = {
        title: String(input.title || '').trim(),
        author: String(input.author || '').trim(),
        description: String(input.description || '').trim(),
        genre: String(input.genre || '').trim(),
        type: String(input.type || '').trim(),
      };
      if (!value.title) errors.title = 'Le titre est obligatoire.';
      return { errors, value };
    }

    function addLibrary(input) {
      const name = String(input.name || '').trim() || 'Nouvelle bibliothèque';
      const lib = {
        id: uid(),
        name,
        rows: U.clampInt(input.rows, MIN_DIM, MAX_DIM, 4),
        cols: U.clampInt(input.cols, MIN_DIM, MAX_DIM, 4),
        theme: THEMES.some((t) => t.id === input.theme) ? input.theme : 'walnut',
        createdAt: nowISO(),
      };
      state.libraries.push(lib);
      save();
      return lib;
    }

    function countBooksOutOfBounds(lib, rows, cols) {
      let n = 0;
      for (const b of state.books) {
        if (b.status === 'in' && b.libraryId === lib.id && (b.row > rows || b.col > cols)) n++;
      }
      return n;
    }

    function updateLibrary(id, patch) {
      const lib = getLibrary(id);
      if (!lib) return { ok: false, evicted: 0 };
      const next = {
        name: (patch.name != null ? String(patch.name).trim() : lib.name) || lib.name,
        rows: patch.rows != null ? U.clampInt(patch.rows, MIN_DIM, MAX_DIM, lib.rows) : lib.rows,
        cols: patch.cols != null ? U.clampInt(patch.cols, MIN_DIM, MAX_DIM, lib.cols) : lib.cols,
        theme: THEMES.some((t) => t.id === patch.theme) ? patch.theme : lib.theme,
      };
      let evicted = 0;
      for (const b of state.books) {
        if (b.status === 'in' && b.libraryId === id && (b.row > next.rows || b.col > next.cols)) {
          b.status = 'out';
          b.libraryId = null;
          b.row = null;
          b.col = null;
          b.updatedAt = nowISO();
          evicted++;
        }
      }
      Object.assign(lib, next);
      save();
      return { ok: true, evicted };
    }

    function deleteLibrary(id) {
      const lib = getLibrary(id);
      if (!lib) return { ok: false, affected: 0 };
      let affected = 0;
      for (const b of state.books) {
        if (b.status === 'in' && b.libraryId === id) {
          b.status = 'out';
          b.libraryId = null;
          b.row = null;
          b.col = null;
          b.updatedAt = nowISO();
          affected++;
        }
      }
      state.libraries = state.libraries.filter((l) => l.id !== id);
      save();
      return { ok: true, affected };
    }

    function addBook(input) {
      const { errors, value } = validateBook(input);
      if (Object.keys(errors).length) return { ok: false, errors };
      const book = Object.assign(value, {
        id: uid(),
        status: 'out',
        libraryId: null,
        row: null,
        col: null,
        createdAt: nowISO(),
        updatedAt: nowISO(),
      });
      state.books.push(book);
      save();
      return { ok: true, book };
    }

    function updateBook(id, patch) {
      const book = getBook(id);
      if (!book) return { ok: false, errors: {} };
      const { errors, value } = validateBook(Object.assign({}, book, patch));
      if (Object.keys(errors).length) return { ok: false, errors };
      Object.assign(book, value, { updatedAt: nowISO() });
      save();
      return { ok: true, book };
    }

    function deleteBook(id) {
      const before = state.books.length;
      state.books = state.books.filter((b) => b.id !== id);
      if (state.books.length !== before) save();
      return { ok: state.books.length !== before };
    }

    function takeOutBook(id) {
      const book = getBook(id);
      if (!book) return { ok: false, error: 'Livre introuvable.' };
      if (book.status === 'out') return { ok: true, book };
      book.status = 'out';
      book.updatedAt = nowISO();
      save();
      return { ok: true, book };
    }

    function shelveBook(id, libraryId, row, col) {
      const book = getBook(id);
      if (!book) return { ok: false, error: 'Livre introuvable.' };
      const lib = getLibrary(libraryId);
      if (!lib) return { ok: false, error: 'Bibliothèque introuvable.' };
      row = U.intOrNull(row);
      col = U.intOrNull(col);
      if (row == null || col == null || row < 1 || col < 1 || row > lib.rows || col > lib.cols) {
        return { ok: false, error: 'Emplacement hors limites.' };
      }
      book.status = 'in';
      book.libraryId = libraryId;
      book.row = row;
      book.col = col;
      book.updatedAt = nowISO();
      save();
      return { ok: true, book, library: lib, sharedWith: booksAt(libraryId, row, col).length - 1 };
    }

    function moveBook(id, libraryId, row, col) {
      return shelveBook(id, libraryId, row, col);
    }

    function seedDemo() {
      if (state.libraries.length || state.books.length) return { ok: false };
      const chambre = addLibrary({ name: 'Bibliothèque de la chambre', rows: 5, cols: 4, theme: 'walnut' });
      const bureau = addLibrary({ name: 'Petite bibliothèque du bureau', rows: 3, cols: 2, theme: 'oak' });

      const demo = [
        { t: 'Le Seigneur des Anneaux', a: 'J.R.R. Tolkien', g: 'Fantasy', ty: 'Roman', d: 'L\'épopée de la Communauté de l\'Anneau.', lib: chambre.id, r: 1, c: 1 },
        { t: 'Dune', a: 'Frank Herbert', g: 'Science-fiction', ty: 'Roman', d: 'Arrakis, l\'épice et les Fremen.', lib: chambre.id, r: 1, c: 2 },
        { t: 'Le Nom de la Rose', a: 'Umberto Eco', g: 'Policier', ty: 'Roman', d: 'Une enquête dans une abbaye médiévale.', lib: chambre.id, r: 1, c: 3 },
        { t: 'Sapiens', a: 'Yuval Noah Harari', g: 'Essai', ty: 'Documentaire', d: 'Une brève histoire de l\'humanité.', lib: chambre.id, r: 2, c: 1 },
        { t: 'Astérix chez les Bretons', a: 'Goscinny & Uderzo', g: 'Aventure', ty: 'BD', d: 'Une aventure gauloise en Albion.', lib: chambre.id, r: 2, c: 2 },
        { t: 'L\'Étranger', a: 'Albert Camus', g: 'Essai', ty: 'Roman', d: 'Meursault, un homme comme les autres… ou pas.', lib: chambre.id, r: 2, c: 3 },
        { t: 'Nausicaä de la Vallée du Vent', a: 'Hayao Miyazaki', g: 'Science-fiction', ty: 'Manga', d: 'La princesse des sables toxiques.', lib: chambre.id, r: 3, c: 1 },
        { t: 'Mémoires d\'Hadrien', a: 'Marguerite Yourcenar', g: 'Histoire', ty: 'Biographie', d: 'L\'empereur se souvient.', lib: chambre.id, r: 3, c: 2 },
        { t: 'Sherlock Holmes — Intégrale', a: 'Arthur Conan Doyle', g: 'Policier', ty: 'Roman', d: 'Les aventures du détective de Baker Street.', lib: bureau.id, r: 1, c: 1 },
        { t: 'Le Petit Prince', a: 'Antoine de Saint-Exupéry', g: 'Jeunesse', ty: 'Roman', d: 'Dessine-moi un mouton.', lib: bureau.id, r: 1, c: 2 },
      ];
      for (const d of demo) {
        const res = addBook({ title: d.t, author: d.a, description: d.d, genre: d.g, type: d.ty });
        shelveBook(res.book.id, d.lib, d.r, d.c);
      }
      const res1 = addBook({ title: 'Fondation', author: 'Isaac Asimov', description: 'Psychohistoire et Empire.', genre: 'Science-fiction', type: 'Roman' });
      const res2 = addBook({ title: 'Le Tour du monde en 80 jours', author: 'Jules Verne', description: 'Le pari de Phileas Fogg.', genre: 'Aventure', type: 'Roman' });
      shelveBook(res1.book.id, chambre.id, 4, 1);
      takeOutBook(res1.book.id);
      takeOutBook(res2.book.id);
      return { ok: true };
    }

    save();

    return {
      GENRES,
      TYPES,
      THEMES,
      MIN_DIM,
      MAX_DIM,
      subscribe,
      listLibraries,
      getLibrary,
      getBook,
      listBooks,
      booksInLibrary,
      booksAt,
      isSlotFree,
      occupiedSlots,
      searchBooks,
      libraryStats,
      globalStats,
      themeName,
      validateBook,
      addLibrary,
      updateLibrary,
      deleteLibrary,
      countBooksOutOfBounds,
      addBook,
      updateBook,
      deleteBook,
      takeOutBook,
      shelveBook,
      moveBook,
      seedDemo,
    };
  })();
})();
