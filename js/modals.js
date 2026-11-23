(function () {
  'use strict';
  const App = (window.App = window.App || {});
  const U = App.util;
  const UI = App.UI;
  const S = () => App.Store;

  App.Modals = (function () {

    /* ---------- Primitives ---------- */

    function field(labelText, inputEl, hint) {
      const wrap = U.el('label', { class: 'field' }, [
        U.el('span', { class: 'field-label' }, labelText),
        inputEl,
      ]);
      if (hint) wrap.append(U.el('span', { class: 'field-hint' }, hint));
      return wrap;
    }

    function showErrors(form, errors) {
      form.querySelectorAll('.field-error').forEach((n) => n.remove());
      Object.entries(errors).forEach(([key, msg]) => {
        const input = form.querySelector('[name="' + key + '"]');
        if (input && input.closest('.field')) {
          input.closest('.field').append(U.el('span', { class: 'field-error' }, msg));
        }
      });
    }

    function actionsRow(buttons) {
      return U.el('div', { class: 'modal-actions' }, buttons);
    }

    function statusBadge(status) {
      return status === 'in'
        ? U.el('span', { class: 'badge in' }, 'Dans la bibliothèque')
        : U.el('span', { class: 'badge out' }, 'Sorti');
    }

    function chip(text) {
      if (!text) return null;
      return U.el('span', { class: 'chip' }, text);
    }

    function locationText(book) {
      const lib = book.libraryId ? S().getLibrary(book.libraryId) : null;
      if (book.status === 'in' && lib) {
        return 'Rangé dans « ' + lib.name + ' » — ' + U.lineCol(book.row, book.col);
      }
      if (lib) return 'Dernier emplacement : « ' + lib.name + ' » — ' + U.lineCol(book.row, book.col);
      return 'Aucun emplacement enregistré.';
    }

    /* ---------- Confirmation destructive ---------- */

    /* UI.confirm est utilisé directement par les vues. */

    /* ---------- Formulaire bibliothèque ---------- */

    function libraryForm(lib, onSaved) {
      const isEdit = !!lib;
      const data = lib || { name: '', rows: 4, cols: 4, theme: 'walnut' };

      const nameIn = U.el('input', { type: 'text', name: 'name', required: true, maxlength: '60', placeholder: 'Ex. Bibliothèque de la chambre', value: data.name });
      const rowsIn = U.el('input', { type: 'number', name: 'rows', min: String(S().MIN_DIM), max: String(S().MAX_DIM), value: String(data.rows) });
      const colsIn = U.el('input', { type: 'number', name: 'cols', min: String(S().MIN_DIM), max: String(S().MAX_DIM), value: String(data.cols) });

      const themeWrap = U.el('div', { class: 'theme-picker', role: 'radiogroup', 'aria-label': 'Apparence' });
      let selectedTheme = data.theme;
      let previewLib = { name: data.name || 'Aperçu', rows: data.rows, cols: data.cols, theme: data.theme };
      const previewZone = U.el('div', { class: 'shelf-preview' });

      function refreshThemePicker() {
        themeWrap.innerHTML = '';
        S().THEMES.forEach((t) => {
          const btn = U.el('button', {
            type: 'button',
            class: 'theme-swatch theme-' + t.id + (t.id === selectedTheme ? ' selected' : ''),
            title: t.name,
            'aria-pressed': String(t.id === selectedTheme),
            onclick: () => {
              selectedTheme = t.id;
              previewLib.theme = t.id;
              refreshThemePicker();
              refreshPreview();
            },
          }, [U.el('span', { class: 'swatch-mini' }), U.el('span', { class: 'swatch-name' }, t.name)]);
          themeWrap.append(btn);
        });
      }

      function refreshPreview() {
        previewZone.innerHTML = '';
        previewZone.append(App.grid.render(previewLib, { compact: true }));
      }

      rowsIn.addEventListener('input', () => {
        previewLib.rows = U.clampInt(rowsIn.value, S().MIN_DIM, S().MAX_DIM, previewLib.rows);
        refreshPreview();
      });
      colsIn.addEventListener('input', () => {
        previewLib.cols = U.clampInt(colsIn.value, S().MIN_DIM, S().MAX_DIM, previewLib.cols);
        refreshPreview();
      });
      nameIn.addEventListener('input', () => { previewLib.name = nameIn.value; });

      refreshThemePicker();
      refreshPreview();

      const form = U.el('form', { class: 'modal-panel form-panel' }, [
        U.el('h3', null, isEdit ? 'Modifier la bibliothèque' : 'Nouvelle bibliothèque'),
        field('Nom', nameIn),
        U.el('div', { class: 'form-row' }, [
          field('Lignes', rowsIn, 'entre ' + S().MIN_DIM + ' et ' + S().MAX_DIM),
          field('Colonnes', colsIn, 'entre ' + S().MIN_DIM + ' et ' + S().MAX_DIM),
        ]),
        U.el('div', { class: 'field' }, [
          U.el('span', { class: 'field-label' }, 'Apparence'),
          themeWrap,
        ]),
        U.el('div', { class: 'field' }, [
          U.el('span', { class: 'field-label' }, 'Aperçu en direct'),
          previewZone,
        ]),
        actionsRow([
          U.el('button', { type: 'button', class: 'btn ghost', onclick: () => close() }, 'Annuler'),
          U.el('button', { type: 'submit', class: 'btn primary' }, isEdit ? 'Enregistrer' : 'Créer'),
        ]),
      ]);
      const close = UI.openModal(form, { label: 'Configuration de la bibliothèque' });

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const payload = {
          name: nameIn.value,
          rows: U.clampInt(rowsIn.value, S().MIN_DIM, S().MAX_DIM, data.rows),
          cols: U.clampInt(colsIn.value, S().MIN_DIM, S().MAX_DIM, data.cols),
          theme: selectedTheme,
        };
        if (isEdit) {
          const evicted = S().countBooksOutOfBounds(lib, payload.rows, payload.cols);
          const apply = () => {
            const res = S().updateLibrary(lib.id, payload);
            if (res.ok) {
              UI.toast('Bibliothèque « ' + payload.name + ' » mise à jour.');
              close();
              if (onSaved) onSaved(res);
            }
          };
          if (evicted > 0) {
            UI.confirm({
              title: 'Rétrécissement de la bibliothèque',
              message: U.plural(evicted, 'livre rangé', 'livres rangés')
                + ' se retrouveront en dehors des nouvelles limites. Ils passeront au statut « Sorti » et perdront leur emplacement. Continuer ?',
              confirmLabel: 'Continuer',
              danger: true,
            }).then((ok) => { if (ok) apply(); });
          } else {
            apply();
          }
        } else {
          const created = S().addLibrary(payload);
          UI.toast('Bibliothèque « ' + created.name + ' » créée.');
          close();
          if (onSaved) onSaved(created);
        }
      });
    }

    /* ---------- Formulaire livre ---------- */

    function bookForm(book, onSaved) {
      const isEdit = !!book;
      const data = book || { title: '', author: '', description: '', genre: '', type: '' };

      const titleIn = U.el('input', { type: 'text', name: 'title', required: true, maxlength: '120', placeholder: 'Titre du livre', value: data.title });
      const authorIn = U.el('input', { type: 'text', name: 'author', maxlength: '80', placeholder: 'Nom de l\'auteur', value: data.author });
      const descIn = U.el('textarea', { name: 'description', rows: '3', maxlength: '600', placeholder: 'Résumé, notes, éditeur…' }, data.description);
      const genreIn = U.el('input', { type: 'text', name: 'genre', list: 'datalist-genres', maxlength: '40', placeholder: 'Choisir ou saisir…', value: data.genre });
      const typeIn = U.el('input', { type: 'text', name: 'type', list: 'datalist-types', maxlength: '40', placeholder: 'Choisir ou saisir…', value: data.type });

      const dlG = U.el('datalist', { id: 'datalist-genres' });
      S().listGenres().forEach((g) => dlG.append(U.el('option', { value: g })));
      const dlT = U.el('datalist', { id: 'datalist-types' });
      S().listTypes().forEach((t) => dlT.append(U.el('option', { value: t })));

      const form = U.el('form', { class: 'modal-panel form-panel' }, [
        U.el('h3', null, isEdit ? 'Modifier le livre' : 'Ajouter un livre'),
        field('Titre *', titleIn),
        field('Auteur', authorIn),
        field('Description', descIn),
        U.el('div', { class: 'form-row' }, [
          field('Genre', genreIn),
          field('Type de livre', typeIn),
        ]),
        isEdit
          ? U.el('p', { class: 'field-hint form-note' }, 'Le statut et l\'emplacement se gèrent depuis la fiche du livre (Sortir / Ranger / Déplacer).')
          : U.el('p', { class: 'field-hint form-note' }, 'Après l\'enregistrement, vous serez invité à choisir l\'emplacement du livre en cliquant sur une case.'),
        U.el('div', { class: 'modal-actions manage-tags-row' }, [
          U.el('button', { type: 'button', class: 'btn ghost small', onclick: () => taxonomyManager() }, '⚙ Gérer mes genres et types'),
        ]),
        actionsRow([
          U.el('button', { type: 'button', class: 'btn ghost', onclick: () => close() }, 'Annuler'),
          U.el('button', { type: 'submit', class: 'btn primary' }, isEdit ? 'Enregistrer' : 'Ajouter le livre'),
        ]),
        dlG,
        dlT,
      ]);
      const close = UI.openModal(form, { label: 'Formulaire livre' });

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const payload = {
          title: titleIn.value,
          author: authorIn.value,
          description: descIn.value,
          genre: genreIn.value,
          type: typeIn.value,
        };
        let res;
        if (isEdit) {
          res = S().updateBook(book.id, payload);
        } else {
          res = S().addBook(payload);
        }
        if (!res.ok) {
          showErrors(form, res.errors || { title: 'Enregistrement impossible.' });
          return;
        }
        UI.toast(isEdit ? 'Livre mis à jour.' : 'Livre « ' + res.book.title + ' » ajouté à la collection.');
        close();
        if (onSaved) onSaved(res.book || res);
      });
    }

    /* ---------- Fiche livre ---------- */

    function bookCard(bookOrId) {
      const Sref = S();
      const book = typeof bookOrId === 'string' ? Sref.getBook(bookOrId) : bookOrId;
      if (!book) return;

      const panel = U.el('div', { class: 'modal-panel book-card' });
      UI.openModal(panel, { label: book.title });
      renderPanel();

      function renderPanel() {
        panel.innerHTML = '';
        const current = Sref.getBook(book.id);
        if (!current) { UI.closeModal(); return; }

        const header = U.el('div', { class: 'card-head' }, [
          U.el('div', { class: 'card-head-text' }, [
            U.el('h3', null, current.title),
            current.author ? U.el('p', { class: 'card-author' }, 'par ' + current.author) : null,
          ]),
          U.el('button', { class: 'icon-btn', type: 'button', title: 'Fermer', 'aria-label': 'Fermer', onclick: () => UI.closeModal() }, '✕'),
        ]);

        const badges = U.el('div', { class: 'badge-row' }, [
          statusBadge(current.status),
          chip(current.genre),
          chip(current.type),
        ]);

        const locationBox = U.el('div', { class: 'location-box' + (current.status === 'in' ? ' in' : '') }, [
          U.el('span', { class: 'location-icon' }, current.status === 'in' ? '🗄️' : '📦'),
          U.el('div', { class: 'location-text' }, [
            U.el('strong', null, current.status === 'in' ? 'Emplacement actuel' : 'Dernier emplacement'),
            U.el('p', null, locationText(current)),
          ]),
          (current.status === 'in' && current.libraryId)
            ? U.el('a', { class: 'btn ghost small', href: '#/bibliotheque/' + current.libraryId, onclick: () => UI.closeModal() }, 'Voir')
            : null,
        ]);

        const descBlock = current.description
          ? U.el('div', { class: 'card-desc' }, [
              U.el('strong', null, 'Description'),
              U.el('p', null, current.description),
            ])
          : null;

        const buttons = [];
        if (current.status === 'in') {
          buttons.push(U.el('button', { class: 'btn warn', type: 'button', onclick: () => doTakeOut() }, '📤 Sortir'));
        }
        buttons.push(U.el('button', {
          class: 'btn' + (current.status === 'out' ? ' primary' : ''),
          type: 'button',
          onclick: () => placeBook(current.id, current.status === 'in' ? 'move' : 'shelve'),
        }, current.status === 'in' ? '🔀 Déplacer' : '📥 Ranger'));
        buttons.push(U.el('button', { class: 'btn ghost', type: 'button', onclick: () => bookForm(current, () => { bookCard(current.id); }) }, '✏️ Modifier'));
        buttons.push(U.el('button', { class: 'btn danger-ghost', type: 'button', onclick: () => doDelete() }, '🗑 Supprimer'));

        panel.append(
          header,
          badges,
          descBlock,
          locationBox,
          actionsRow(buttons)
        );
      }

      function doTakeOut() {
        const res = Sref.takeOutBook(book.id);
        if (res.ok) {
          UI.toast('« ' + book.title + ' » est maintenant sorti. Son emplacement reste mémorisé.');
          renderPanel();
        } else {
          UI.toast(res.error || 'Action impossible.', 'error');
        }
      }

      function doDelete() {
        UI.confirm({
          title: 'Supprimer ce livre',
          message: 'Supprimer définitivement « ' + book.title + ' » de la collection ? Cette action est irréversible.',
          confirmLabel: 'Supprimer',
          danger: true,
        }).then((ok) => {
          if (!ok) return;
          const res = Sref.deleteBook(book.id);
          if (res.ok) {
            UI.toast('« ' + book.title + ' » supprimé de la collection.');
            UI.closeModal();
          }
        });
      }
    }

    /* ---------- Ranger / Déplacer : choix bibliothèque puis case ---------- */

    function placeBook(bookId, mode) {
      const Sref = S();
      const libraries = Sref.listLibraries();

      if (!libraries.length) {
        UI.openModal(U.el('div', { class: 'modal-panel confirm-panel' }, [
          U.el('h3', null, 'Aucune bibliothèque'),
          U.el('p', { class: 'confirm-message' }, 'Créez d\'abord une bibliothèque pour pouvoir ranger vos livres.'),
          actionsRow([
            U.el('button', { class: 'btn ghost', type: 'button', onclick: () => UI.closeModal() }, 'Annuler'),
            U.el('button', {
              class: 'btn primary', type: 'button',
              onclick: () => { UI.closeModal(); libraryForm(null); },
            }, '+ Nouvelle bibliothèque'),
          ]),
        ]));
        return;
      }

      const book = Sref.getBook(bookId);
      if (!book) return;

      stepChooseLibrary();

      function stepChooseLibrary() {
        const list = U.el('div', { class: 'lib-pick-list' });
        libraries.forEach((lib) => {
          const st = Sref.libraryStats(lib.id);
          const isCurrent = book.libraryId === lib.id && (book.status === 'in');
          list.append(U.el('button', {
            type: 'button',
            class: 'lib-pick-item',
            onclick: () => stepChooseSlot(lib),
          }, [
            U.el('span', { class: 'lib-pick-swatch theme-' + lib.theme }),
            U.el('span', { class: 'lib-pick-text' }, [
              U.el('strong', null, lib.name + (isCurrent ? '  ·  position actuelle' : '')),
              U.el('small', null, lib.rows + ' × ' + lib.cols + ' cases — ' + U.plural(st.free, 'case libre', 'cases libres') + ' · empilement possible'),
            ]),
            U.el('span', { class: 'lib-pick-arrow', 'aria-hidden': 'true' }, '→'),
          ]));
        });

        const panel = U.el('div', { class: 'modal-panel form-panel' }, [
          U.el('h3', null, mode === 'move' ? 'Déplacer : choisir une bibliothèque' : 'Ranger : choisir une bibliothèque'),
          U.el('p', { class: 'field-hint' }, '« ' + book.title + ' » — ' + (mode === 'move' ? 'son emplacement actuel sera libéré automatiquement.' : 'le cas échéant, son ancien emplacement est conservé en mémoire tant qu\'il reste sorti.')),
          list,
          actionsRow([U.el('button', { class: 'btn ghost', type: 'button', onclick: () => UI.closeModal() }, 'Annuler')]),
        ]);
        UI.openModal(panel, { label: 'Choix de la bibliothèque' });
      }

      function stepChooseSlot(lib) {
        const statusLine = U.el('p', { class: 'field-hint slot-hint' }, 'Cliquez sur une case pour y ranger « ' + book.title + ' » (une case peut accueillir plusieurs livres).');

        const gridHost = U.el('div', { class: 'slot-picker-grid' });
        const panelFooter = actionsRow([
          U.el('button', { class: 'btn ghost', type: 'button', onclick: () => stepChooseLibrary() }, '← Changer de bibliothèque'),
          U.el('button', { class: 'btn ghost', type: 'button', onclick: () => UI.closeModal() }, 'Annuler'),
        ]);

        function drawGrid() {
          gridHost.innerHTML = '';
          gridHost.append(App.grid.render(lib, {
            selectable: true,
            currentBookId: book.status === 'in' ? book.id : null,
            onSlotClick: (r, c, count) => {
              const res = Sref.shelveBook(book.id, lib.id, r, c);
              if (res.ok) {
                UI.closeModal();
                const spot = U.lineCol(r, c);
                const shared = res.sharedWith > 0
                  ? ' (case partagée avec ' + U.plural(res.sharedWith, 'autre livre', 'autres livres') + ')'
                  : '';
                UI.toast('« ' + book.title + ' » rangé dans « ' + lib.name + ' » — ' + spot + shared + '.');
              } else {
                UI.toast(res.error || 'Placement impossible.', 'error');
                drawGrid();
              }
            },
          }));
          gridHost.append(App.grid.legend({ selectable: true }));
        }

        const panel = U.el('div', { class: 'modal-panel form-panel wide' }, [
          U.el('h3', null, 'Ranger dans « ' + lib.name + ' »'),
          statusLine,
          gridHost,
          panelFooter,
        ]);
        UI.openModal(panel, { label: 'Choix de l\'emplacement' });
        drawGrid();
      }
    }

    /* ---------- Menu d'une case (vue bibliothèque) ---------- */

    function slotMenu(libId, row, col) {
      const Sref = S();
      const lib = Sref.getLibrary(libId);
      if (!lib) return;
      const booksHere = Sref.booksAt(libId, row, col);
      const outBooks = Sref.listBooks({ status: 'out' }).sort((a, b) => a.title.localeCompare(b.title, 'fr'));

      const content = [];
      const close = { c: null };

      if (booksHere.length) {
        const hereList = U.el('div', { class: 'lib-pick-list' });
        booksHere.forEach((b) => {
          hereList.append(U.el('button', {
            type: 'button',
            class: 'lib-pick-item',
            onclick: () => { close.c(); bookCard(b.id); },
          }, [
            U.el('span', { class: 'lib-pick-icon' }, '📖'),
            U.el('span', { class: 'lib-pick-text' }, [
              U.el('strong', null, b.title),
              U.el('small', null, b.author || 'Auteur inconnu'),
            ]),
          ]));
        });
        content.push(U.el('div', { class: 'field' }, [
          U.el('span', { class: 'field-label' }, U.plural(booksHere.length, 'Livre dans cette case', 'Livres dans cette case') + ' — cliquez pour ouvrir sa fiche'),
          hereList,
        ]));
      }

      if (outBooks.length) {
        const outList = U.el('div', { class: 'lib-pick-list' });
        outBooks.forEach((b) => {
          const prevLib = b.libraryId && Sref.getLibrary(b.libraryId) ? Sref.getLibrary(b.libraryId).name : null;
          outList.append(U.el('button', {
            type: 'button',
            class: 'lib-pick-item',
            onclick: () => {
              const res = Sref.shelveBook(b.id, lib.id, row, col);
              if (res.ok) {
                close.c();
                const shared = res.sharedWith > 0 ? ' (case partagée)' : '';
                UI.toast('« ' + b.title + ' » rangé — ' + U.lineCol(row, col) + ', ' + lib.name + shared + '.');
              } else {
                UI.toast(res.error || 'Placement impossible.', 'error');
              }
            },
          }, [
            U.el('span', { class: 'lib-pick-icon' }, '📥'),
            U.el('span', { class: 'lib-pick-text' }, [
              U.el('strong', null, b.title),
              U.el('small', null, (b.author || 'Auteur inconnu') + (prevLib ? ' — précédemment : ' + U.lineCol(b.row, b.col) + ' (' + prevLib + ')' : '')),
            ]),
            U.el('span', { class: 'btn small primary' }, 'Ranger ici'),
          ]));
        });
        content.push(U.el('div', { class: 'field' }, [
          U.el('span', { class: 'field-label' }, 'Ranger un livre sorti dans cette case'),
          outList,
        ]));
      }

      if (!content.length) {
        content.push(U.el('p', { class: 'confirm-message' }, 'Cette case est libre, mais aucun livre n\'est actuellement sorti. Tout est en ordre !'));
      }

      const panel = U.el('div', { class: 'modal-panel form-panel' }, [
        U.el('h3', null, U.lineCol(row, col) + ' — ' + lib.name),
        ...content,
        actionsRow([U.el('button', { class: 'btn ghost', type: 'button', onclick: () => close.c() }, 'Fermer')]),
      ]);
      close.c = UI.openModal(panel, { label: 'Case ' + U.lineCol(row, col) });
    }

    /* ---------- Gestionnaire des genres et types ---------- */

    function taxonomyManager() {
      const Sref = S();
      const panel = U.el('div', { class: 'modal-panel form-panel' });
      UI.openModal(panel, { label: 'Genres et types de livres' });
      renderPanel();

      function renderPanel() {
        panel.innerHTML = '';
        panel.append(
          U.el('h3', null, '⚙ Mes genres et types'),
          U.el('p', { class: 'field-hint' },
            'Ces listes alimentent les suggestions des formulaires et les filtres de la collection. '
            + 'Saisir un nouveau genre ou type sur un livre l\'ajoute aussi automatiquement ici.'),
          U.el('div', { class: 'taxonomy-cols' }, [
            taxColumn('Genres', 'genre', Sref.listGenres()),
            taxColumn('Types de livre', 'type', Sref.listTypes()),
          ]),
          actionsRow([U.el('button', { class: 'btn ghost', type: 'button', onclick: () => UI.closeModal() }, 'Fermer')]),
        );
      }

      function taxColumn(label, kind, items) {
        const listEl = U.el('div', { class: 'taxonomy-list' });
        items.forEach((name) => {
          const used = Sref.tagUsageCount(kind, name);
          listEl.append(U.el('span', { class: 'taxonomy-chip' + (used ? ' used' : '') }, [
            name,
            U.el('button', {
              type: 'button',
              class: 'taxonomy-remove',
              title: used ? 'Utilisé par ' + U.plural(used, 'livre', 'livres') + ' — suppression refusée' : 'Supprimer « ' + name + ' »',
              'aria-label': 'Supprimer ' + name,
              onclick: () => {
                const res = kind === 'genre' ? Sref.removeGenre(name) : Sref.removeType(name);
                if (res.ok) renderPanel();
                else UI.toast(res.error, 'error');
              },
            }, '✕'),
          ]));
        });

        const inputEl = U.el('input', { type: 'text', placeholder: 'Nouveau ' + label.toLowerCase() + '…', maxlength: '40', 'aria-label': label });
        const addBtn = U.el('button', { type: 'button', class: 'btn ghost small' }, '+ Ajouter');
        function doAdd() {
          const res = kind === 'genre' ? Sref.addGenre(inputEl.value) : Sref.addType(inputEl.value);
          if (res.ok) {
            inputEl.value = '';
            renderPanel();
          } else {
            UI.toast(res.error, 'error');
          }
        }
        addBtn.addEventListener('click', doAdd);
        inputEl.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            doAdd();
          }
        });

        return U.el('div', { class: 'field' }, [
          U.el('span', { class: 'field-label' }, label),
          listEl,
          U.el('div', { class: 'taxonomy-add' }, [inputEl, addBtn]),
        ]);
      }
    }

    /* ---------- Sauvegarde : export / import ---------- */

    function downloadFile(text, filename) {
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = U.el('a', { href: url, download: filename });
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    }

    function backupCenter() {
      const Sref = S();
      const panel = U.el('div', { class: 'modal-panel form-panel' });
      UI.openModal(panel, { label: 'Sauvegarde des données' });
      renderPanel();

      function renderPanel() {
        panel.innerHTML = '';
        const counts = Sref.dataCounts();
        panel.append(
          U.el('h3', null, '💾 Sauvegarde de vos données'),
          U.el('p', { class: 'field-hint' },
            'Collection actuelle : ' + U.plural(counts.libraries, 'bibliothèque', 'bibliothèques') + ' et ' + U.plural(counts.books, 'livre', 'livres')
            + '. Vos données restent enregistrées automatiquement ; ce fichier est une copie de sécurité manuelle.'),
          U.el('div', { class: 'modal-actions backup-actions' }, [
            U.el('button', {
              class: 'btn primary', type: 'button',
              onclick: () => {
                const d = new Date();
                const stamp = d.getFullYear() + '-'
                  + String(d.getMonth() + 1).padStart(2, '0') + '-'
                  + String(d.getDate()).padStart(2, '0');
                downloadFile(Sref.exportData(), 'sauvegarde-bibliotheque-' + stamp + '.json');
                UI.toast('Sauvegarde téléchargée : sauvegarde-bibliotheque-' + stamp + '.json');
              },
            }, '📤 Exporter ma bibliothèque'),
            U.el('button', { class: 'btn ghost', type: 'button', onclick: () => chooseImportFile() }, '📥 Importer une sauvegarde'),
          ]),
          U.el('p', { class: 'field-hint form-note' },
            'Conseil : faites un export avant chaque mise à jour de l\'application, et conservez le fichier avec vos documents (clé USB, cloud…). L\'import remplace intégralement la collection actuelle par celle du fichier choisi.'),
          actionsRow([U.el('button', { class: 'btn ghost', type: 'button', onclick: () => UI.closeModal() }, 'Fermer')]),
        );
      }

      function chooseImportFile() {
        const input = U.el('input', {
          type: 'file',
          accept: '.json,application/json',
          style: 'display:none',
        });
        input.addEventListener('change', () => {
          const file = input.files && input.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => confirmImport(String(reader.result), file.name);
          reader.onerror = () => UI.toast('Lecture du fichier impossible.', 'error');
          reader.readAsText(file);
        });
        document.body.append(input);
        input.click();
        setTimeout(() => input.remove(), 60000);
      }

      function confirmImport(jsonText, filename) {
        const S2 = S();
        let counts;
        const probe = S2.importProbe(jsonText);
        if (!probe.ok) {
          UI.toast(probe.error, 'error');
          return;
        }
        counts = probe.counts;
        const current = S2.dataCounts();
        UI.confirm({
          title: 'Importer « ' + filename + ' » ?',
          message: 'Ce fichier contient ' + U.plural(counts.libraries, 'bibliothèque', 'bibliothèques') + ' et ' + U.plural(counts.books, 'livre', 'livres') + '. '
            + 'Il remplacera intégralement la collection actuelle (' + U.plural(current.books, 'livre', 'livres') + '). Continuer ?',
          confirmLabel: 'Importer',
          danger: false,
        }).then((ok) => {
          if (!ok) return;
          const res = S2.importData(jsonText);
          if (res.ok) {
            UI.closeModal();
            UI.toast('Sauvegarde importée : ' + U.plural(res.counts.libraries, 'bibliothèque', 'bibliothèques') + ' et ' + U.plural(res.counts.books, 'livre', 'livres') + ' restaurés.');
          } else {
            UI.toast(res.error || 'Import impossible.', 'error');
          }
        });
      }
    }

    return { libraryForm, bookForm, bookCard, placeBook, slotMenu, taxonomyManager, backupCenter, statusBadge, chip };
  })();
})();
