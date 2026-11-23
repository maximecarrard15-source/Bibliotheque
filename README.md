# Ma Bibliothèque 📚

Application web de gestion de bibliothèques physiques : enregistrez tous vos livres, visualisez vos étagères case par case, sortez et rangez vos livres en un clic.

Aucune dépendance, aucun build : HTML + CSS + JavaScript vanilla. Fonctionne hors ligne (données sauvegardées dans le navigateur via `localStorage`, sauvegarde automatique à chaque modification, sans rechargement de page).

## Démarrage

### Utiliser l'application en local sur Windows (recommandé)

Aucune installation de logiciel, aucune connexion Internet requise après le premier téléchargement.

1. **Téléchargez le dossier de l'application** : sur GitHub, bouton vert **Code → Download ZIP** ([lien direct du ZIP](https://github.com/maximecarrard15-source/Bibliotheque/archive/refs/heads/main.zip)), puis extrayez-le où vous voulez (ex. `Documents\Bibliotheque`).
2. **Double-cliquez sur `Lancer-la-bibliotheque.bat`.**
   - Si Windows affiche un avertissement PowerShell, choisissez « Exécuter » / « Exécuter quand même » (le script est local, il ne fait que servir les fichiers de ce dossier sur `127.0.0.1`, invisible des autres machines).
   - L'application s'ouvre automatiquement dans une **fenêtre Microsoft Edge dédiée**, sans barre d'adresse.
3. Laissez la petite fenêtre noire (le serveur local) ouverte pendant l'utilisation ; fermez-la pour arrêter.
4. **Pour la retrouver comme un vrai logiciel** : dans la fenêtre de l'application, cliquez sur **« 📲 Installer »** (ou dans Edge : menu ⋯ → *Applications* → *Installer ce site en tant qu'application*). Un raccourci « Ma Bibliothèque » est créé dans le **menu Démarrer** ; l'app utilise alors son propre cache et reste pleinement fonctionnelle hors ligne.

⚠️ **Important — vos données** : la collection est enregistrée dans le navigateur, par adresse. Lancez donc toujours l'application **par le même moyen** (le fichier `.bat` ou l'app installée depuis elle), pas en double-cliquant directement sur `index.html` dans l'Explorateur — sinon vous verriez une bibliothèque vide (origine `file://` différente de l'origine locale).

Pour désinstaller : supprimez le dossier, et éventuellement menu Démarrer → clic droit « Ma Bibliothèque » → Désinstaller.

### Autres façons de la lancer (avancé)

- N'importe quel serveur statique : `python3 -m http.server 8000` puis `http://localhost:8000`.
- Déploiement Vercel (usage sur plusieurs appareils) : import du dépôt, **Framework Preset = Other**, **Build Command** vide, **Output Directory** `.`.

## Fonctionnalités

- **Plusieurs bibliothèques** : création, renommage, redimensionnement (1 à 12 lignes / colonnes), 5 apparences (Noyer, Chêne clair, Vert sauge, Ardoise, Nuit), aperçu en direct, suppression avec confirmation. Si la grille est rétrécie, les livres hors limites passent automatiquement au statut « Sorti » (signalé avant validation).
- **Collection globale de livres** : titre (obligatoire), auteur, description, genre, type, statut, emplacement. Modification et suppression à tout moment.
- **Barre de recherche globale** (en-tête, toujours visible) : titre, auteur, genre, type et nom de bibliothèque. Suggestions instantanées + page de résultats détaillés (statut, bibliothèque, ligne/colonne).
- **Sortir un livre** : un clic depuis sa fiche → statut « Sorti », l'emplacement d'origine reste mémorisé pour un rangement facile.
- **Ranger un livre** : choix de la bibliothèque → représentation graphique → clic sur une case (libre ou déjà occupée, position actuelle surlignée). Statut recalisé et synchronisation immédiate partout.
- **Déplacer un livre** : même flux depuis une fiche ; l'ancien emplacement est automatiquement libéré.
- **Case vide cliquable** dans la vue bibliothèque : liste des livres sortis à ranger directement dans cette case.
- **Tableau de bord** : total, livres rangés, livres sortis, cases occupées/disponibles, aperçu de chaque bibliothèque, section « Livres sortis à ranger », dernières activités.
- **Collection** en vue grille ou liste, filtres (genre, type, statut), tri, filtre texte.
- **Empilement** : une même case peut accueillir autant de livres que vous voulez (badge « +N » sur la case, menu détaillé au clic). Mais un livre ne se trouve physiquement qu'à un seul emplacement à la fois ; les statistiques comptent les cases occupées (≥ 1 livre) et libres (0 livre).
- Interface responsive (ordinateur, tablette, téléphone), animations discrètes, aucun rechargement de page (SPA à routage par ancre).

## Architecture

```
index.html              Page unique (SPA)
css/styles.css          Thème, étagères, modales, responsive, animations
js/util.js              Helpers (DOM, échappement, ids, dates)
js/store.js             Couche données : état versionné, persistance localStorage,
                        validations, garde-fous d'occupation, statistiques, recherche
js/ui.js                Modales, toasts, dialogues de confirmation
js/grid.js              Moteur de rendu visuel des étagères (réutilisable partout)
js/modals.js            Fiches livre, formulaires, flux Ranger/Déplacer en 2 étapes
js/views-*.js           Vues : tableau de bord, bibliothèques, collection, recherche
js/app.js               Routeur SPA + barre de recherche + installation PWA
manifest.webmanifest    Manifeste d'application installable (PWA)
sw.js                   Service worker : cache hors ligne + installabilité
icons/                  Icônes de l'application (192, 512, maskable, favicon)
Lancer-la-bibliotheque.bat   Lanceur Windows double-clic
windows/serveur-local.ps1    Mini-serveur HTTP local (PowerShell, sans install)
```

### Modèle de données (`localStorage`, clé `bibliotheque-app:v1`)

```json
{
  "version": 1,
  "libraries": [
    { "id": "…", "name": "Bibliothèque de la chambre", "rows": 5, "cols": 4, "theme": "walnut", "createdAt": "…" }
  ],
  "books": [
    {
      "id": "…", "title": "Dune", "author": "Frank Herbert", "description": "…",
      "genre": "Science-fiction", "type": "Roman",
      "status": "in",
      "libraryId": "…",
      "row": 1, "col": 2,
      "createdAt": "…", "updatedAt": "…"
    }
  ]
}
```

- `status` : `"in"` = dans la bibliothèque, `"out"` = sorti.
- Un livre `in` a toujours `libraryId`, `row` et `col` renseignés ; plusieurs livres `in` peuvent partager la même case (empilement).
- Un livre sorti conserve son dernier emplacement (ou aucun s'il n'a jamais été rangé, ou si sa bibliothèque a été supprimée).

### Étendre l'application

Toutes les mutations passent par `App.Store` (source de vérité + persistance + notifications) ; les vues se re-rendent via `subscribe`. Pour ajouter une fonctionnalité : nouvelle fonction dans `store.js` si elle touche aux données, nouveau panneau dans `modals.js` s'il est modéal, nouvelle vue dans `views-*.js` et une route dans `app.js`.
