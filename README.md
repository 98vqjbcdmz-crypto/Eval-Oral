# Tableau de bord IFMK – Évaluations orales

## Contenu
- `index.html` : page autonome, sans dépendance externe.

## Mise en ligne sur GitHub Pages
1. Créer un dépôt GitHub.
2. Déposer `index.html` à la racine du dépôt.
3. Dans **Settings > Pages**, choisir la branche principale et le dossier `/root`.
4. Ouvrir l'URL GitHub Pages générée.

## Logo IFMK
La page essaie d'afficher un fichier `logo-ifmk.png` placé au même niveau que `index.html`.
Si ce fichier n'est pas présent, un emplacement de remplacement reste affiché.

## Fonctionnement
- Coller la liste des étudiants, un nom par ligne.
- Coller la liste des cas cliniques, un cas par ligne.
- Charger la session.
- Premier binôme : les 2 premiers étudiants préparent, chacun avec contrôle d'identité, tirage et minuteur de 15 minutes.
- Choisir ensuite qui passe en premier et qui fait le patient.
- Le 3e étudiant entre alors en préparation.
- À chaque fin d'oral, cliquer sur **Passage terminé / rotation**.

## Données
La session est sauvegardée localement dans le navigateur.


## Vue rétro / vidéoprojecteur
- `retro.html` : vue grand format pour la salle.
- Ouvrir `index.html` pour piloter la session.
- Ouvrir `retro.html` dans un autre onglet ou sur l'écran du rétro.
- Les deux vues partagent la même session via le stockage local du navigateur.

## Règle d'urne intégrée
- Un cas clinique est retiré de l'urne uniquement pendant le passage de l'étudiant concerné.
- Le cas revient automatiquement dans l'urne dès la fin du passage.
- Le tirage du préparant exclut donc seulement le cas actuellement présenté.
- Cas particulier du premier binôme : après le premier oral, utiliser **Faire passer l'autre du binôme initial** pour que le second étudiant du binôme passe à son tour sans faire sortir le préparant déjà entré.
