# CustHome — page d'accueil Dolibarr à tuiles

Module Dolibarr (id 185168) qui remplace ou complète la page d'accueil par une grille de tuiles modernes, éditables directement dans la page.

## Fonctionnalités

- Tuiles : titre, sous-titre, icône Font Awesome 5, couleur de fond / texte (palette de présélections), taille (1x1, 2x1, 1x2, 2x2, 3x1, 4x1), lien, ouverture dans un nouvel onglet.
- Mode édition en place : clic sur une tuile → panneau latéral ; drag & drop pour réordonner.
- **Sauvegarde automatique** (AJAX, debounce 500 ms, indicateur "Enregistré ✓").
- Sélecteur de lien : toutes les entrées du menu Dolibarr visibles par l'utilisateur (par menu principal) + les pages PHP des modules custom activés + URL libre.
- Portée : grille globale partagée (droit "Modifier les tuiles") ou grille par utilisateur.
- Option "Utiliser comme page d'accueil" (`MAIN_LANDING_PAGE`), retirée automatiquement à la désactivation du module.

## Installation

Copier dans `custom/custhome`, activer le module, régler `Configuration > Modules > CustHome`. Page : `/custhome/index.php` (aussi dans le menu gauche de l'accueil).

## Stockage

JSON dans la constante `CUSTHOME_TILES` (par entité) ou dans le paramètre utilisateur `CUSTHOME_TILES` en portée "par utilisateur".
