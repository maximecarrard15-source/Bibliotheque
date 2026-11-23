(function () {
  'use strict';
  const App = (window.App = window.App || {});
  const U = App.util;

  function parseRoute() {
    const raw = location.hash.replace(/^#/, '') || '/';
    const [path, query] = raw.split('?');
    return {
      segments: path.split('/').filter(Boolean),
      params: new URLSearchParams(query || ''),
    };
  }

  function setActiveNav(segments) {
    const nav = document.getElementById('main-nav');
    if (!nav) return;
    let key = 'dashboard';
    if (segments[0] === 'bibliotheques' || segments[0] === 'bibliotheque') key = 'libraries';
    else if (segments[0] === 'livres' || segments[0] === 'recherche') key = 'books';
    nav.querySelectorAll('a').forEach((a) => {
      a.classList.toggle('active', a.dataset.nav === key);
    });
  }

  function render() {
    hideSuggestions();
    const view = document.getElementById('view');
    const state = parseRoute();
    while (view.firstChild) view.removeChild(view.firstChild);
    setActiveNav(state.segments);

    try {
      const seg = state.segments;
      if (seg.length === 0) {
        view.append(App.Views.dashboard());
      } else if (seg[0] === 'bibliotheques') {
        view.append(App.Views.libraryList());
      } else if (seg[0] === 'bibliotheque' && seg[1]) {
        const el = App.Views.libraryDetail(seg[1]);
        view.append(el || App.Views.libraryList());
      } else if (seg[0] === 'livres') {
        view.append(App.Views.books());
      } else if (seg[0] === 'recherche') {
        view.append(App.Views.search(state.params.get('q') || ''));
      } else {
        view.append(App.Views.dashboard());
      }
    } catch (e) {
      console.error(e);
      view.append(U.el('div', { class: 'empty-state card' }, [
        U.el('h2', null, 'Une erreur est survenue'),
        U.el('p', null, String(e && e.message ? e.message : e)),
      ]));
    }
  }

  /* ---------- Recherche globale ---------- */

  function searchInput() { return document.getElementById('global-search'); }
  function suggestionsBox() { return document.getElementById('search-suggestions'); }

  function hideSuggestions() {
    const box = suggestionsBox();
    if (box) box.hidden = true;
  }

  function renderSuggestions(q) {
    const box = suggestionsBox();
    const input = searchInput();
    if (!box || !input) return;
    box.innerHTML = '';

    const t = q.trim();
    if (!t) { box.hidden = true; return; }

    App.Store.searchBooks(t).slice(0, 6).forEach((b) => {
      const lib = b.libraryId ? App.Store.getLibrary(b.libraryId) : null;
      box.append(U.el('button', { type: 'button', class: 'suggestion', onclick: () => {
        hideSuggestions();
        input.value = '';
        App.Modals.bookCard(b.id);
      } }, [
        U.el('div', { class: 'sug-main' }, [
          U.el('strong', null, b.title),
          U.el('small', null, (b.author || 'Auteur inconnu')
            + (lib ? '  ·  ' + lib.name + (b.row ? ' — ' + U.lineCol(b.row, b.col) : '') : '  ·  non rangé')),
        ]),
        U.el('span', { class: 'sug-badge' }, [App.Modals.statusBadge(b.status)]),
      ]));
    });

    box.append(U.el('button', { type: 'button', class: 'suggestion all-results', onclick: () => {
      hideSuggestions();
      location.hash = '#/recherche?q=' + encodeURIComponent(t);
    } }, [U.el('strong', null, 'Voir tous les résultats pour « ' + t + ' » →')]));

    box.hidden = false;
  }

  function wireSearch() {
    const input = searchInput();
    if (!input) return;

    input.addEventListener('input', U.debounce(() => renderSuggestions(input.value), 140));

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && input.value.trim()) {
        e.preventDefault();
        hideSuggestions();
        if (location.hash === '#/recherche?q=' + encodeURIComponent(input.value.trim())) render();
        else location.hash = '#/recherche?q=' + encodeURIComponent(input.value.trim());
      }
      if (e.key === 'Escape') hideSuggestions();
    });

    input.addEventListener('focus', () => {
      if (input.value.trim()) renderSuggestions(input.value);
    });

    document.addEventListener('click', (e) => {
      const box = document.getElementById('search-box');
      if (box && !box.contains(e.target)) hideSuggestions();
    });
  }

  /* ---------- Init ---------- */

  let booted = false;
  function boot() {
    if (booted) return;
    booted = true;
    wireSearch();
    render();
  }

  window.addEventListener('hashchange', render);
  App.Store.subscribe(render);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
