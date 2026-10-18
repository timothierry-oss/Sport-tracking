# Suivi Sport — Spécification du projet (PWA)

> Document de passation : à placer à la racine du dépôt (`SPEC.md`) et à donner à Claude Code comme contexte.
> Utilisateur : Tim, étudiant ingénieur, utilise l'app seul pour l'instant (partage possible plus tard). Langue de l'interface : **français**.

## 1. Objectif

Application mobile de suivi d'activités sportives : **streetlifting** et **jiu-jitsu brésilien (BJJ)**, pour suivre sa progression, planifier ses séances et noter ses cours. Facile à utiliser, très visuelle, minimaliste mais sportive.

## 2. Décisions techniques arrêtées

- **PWA** installée depuis Safari sur iPhone (« Partager > Sur l'écran d'accueil »). Pas d'app native pour l'instant.
- **Local d'abord / hors ligne** : données stockées sur l'appareil (IndexedDB). Service worker + manifest.
- **Cloud en phase 2** (comptes, synchro, partage) : Supabase envisagé. Ne pas le construire dans le MVP.
- **Stack** : React + TypeScript + Vite, Recharts pour les graphes, mobile d'abord.
- **Hébergement** : GitHub Pages (dépôt public `suivi-sport`, déploiement automatique via GitHub Actions à chaque push). Tim a un compte GitHub. Ne pas utiliser le GitLab de l'école (IMT Atlantique).
- **Multi-sport dès la conception** : un « sport » est un objet générique (exercices et champs paramétrables). Streetlifting et BJJ sont les deux premiers modèles. Ajouter un sport plus tard ne doit pas demander de refonte.
- **Sauvegarde** : bouton **Exporter / Importer** les données (JSON) dans les réglages.
- Unités : **kg uniquement**, incréments de **2,5 kg** (à confirmer, valeur par défaut retenue).
- Attention : `base` de Vite à configurer pour GitHub Pages (`/suivi-sport/`), et chemins du manifest/service worker en conséquence.

## 3. Ce qui est explicitement exclu (pour l'instant)

- Pas de poids de corps, pas de calcul de charge totale « poids de corps + lest ».
- Pas d'images d'exercices (prévoir éventuellement le champ plus tard).
- Pas de chronomètre de repos (le temps de repos reste un champ saisi).
- Pas de rappels ni de notifications.
- Pas de suivi du sommeil, des blessures, etc. : uniquement les entraînements.

## 4. Design

- **Minimaliste mais sportif**, cartes très arrondies, boutons « pilule », gros chiffres pour les charges.
- **Accent corail** (choisi par Tim).
- **Thème clair et sombre**, avec bascule dans les réglages.
  - Clair : fond blanc cassé, boutons noirs, accent corail, anneaux et petites barres pour les stats.
  - Sombre : noir profond, accent corail.
- Inspirations fournies par Tim : app fitness au fond clair avec bande des jours de la semaine (jours faits en noir, jour actuel en corail, cartes arrondies, anneaux de progression) ; dashboards sobres avec grands chiffres et courbes fines ; version sombre avec dégradés doux.
- **Saisie en salle : minimum de taps** : gros boutons +/− (2,5 kg, 1 rep), préremplissage avec la dernière séance, bouton « Dupliquer la série », validation d'une série en 2 taps.

## 5. Navigation

Barre du bas, 4 onglets :

| Onglet | Contenu |
|---|---|
| **Accueil** | Bande des 7 jours, séance du jour (bouton Démarrer), courbe de tonnage, résumé de la semaine |
| **Séances** | Planning, historique, création de séance (streetlifting ou BJJ) |
| **Stats** | Volume, intensité, force/endurance, régularité, répartition des sports |
| **Objectifs** | Objectifs en cours et atteints, progression |

**Réglages** (icône en haut de l'accueil) : thème, gestion des exercices, tags BJJ, export/import des données.

## 6. Fonctionnalités détaillées

### 6.1 Streetlifting
- Exercices **personnalisables** : au départ, *traction lestée*, *dips lestés*, *muscle-up lesté* (Tim leste aussi ses muscle-ups, donc les trois sont traités pareil).
- Par **série** : charge (lest), répétitions, **RPE**, **ressenti**, **temps de repos**, case « validée ».
- **1RM estimé** par exercice (formule d'Epley), badge quand un record personnel est battu.
- Séances **planifiées** : cases à cocher pour valider chaque série une fois faite.

### 6.2 BJJ
- Par cours : date, type (gi / no-gi, technique, sparring, etc.), durée, ressenti, déroulé, remarques, **points à améliorer**.
- **Techniques vues**, avec **tags** (liste de base modifiable : passage de garde, soumission, garde, balayage, takedown, transition, défense…).
- **Liens vidéo** (YouTube, etc.) rattachés à une technique ou au cours.
- Recherche et filtre par tag dans l'historique.

### 6.3 Planificateur
- Création de séances à l'avance, par date.
- Programme écrit par Tim lui-même, avec un outil de saisie rapide : champs préremplis (dernière charge, séries et reps habituelles), **modèles de séance réutilisables** (ex. « Pull A ») à dupliquer.

### 6.4 Accueil
- Séance du jour avec gros bouton **Démarrer**.
- **Courbe de progression du tonnage** (charge totale soulevée) par semaine, sur les 8 à 12 dernières semaines, tonnage de la semaine en gros chiffre avec l'écart vs semaine précédente (ex. « +8 % »), sélecteur Semaine / Mois, filtre par exercice (tous, traction, dips, muscle-up).
- Résumé de la semaine : séances, reps, intensité moyenne.
- Accès rapide : « + Séance streetlifting » et « + Cours BJJ ».

### 6.5 Stats
1. Tonnage par semaine.
2. Volume de répétitions par semaine.
3. **Intensité** : % du 1RM estimé et RPE moyen.
4. **Répartition force / intermédiaire / volume** (barres empilées par semaine ou par mois), avec pour chaque catégorie : charge moyenne, 1RM estimé, RPE moyen.
5. Progression du 1RM estimé par exercice.
6. Régularité : heatmap des jours d'entraînement et séances par semaine.
7. Répartition streetlifting / BJJ (gestion de l'effort entre les deux).

### 6.6 Objectifs
- Création d'un objectif : exercice + valeur cible (ex. traction lestée +40 kg) ou fréquence (ex. 4 séances par semaine), échéance optionnelle.
- Barre de progression automatique, bouton « Marquer comme atteint », archive des objectifs réussis, graphe de progression.

## 7. Définitions de calcul

- **Charge totale soulevée = tonnage** = Σ (charge ajoutée × reps) sur toutes les séries. Sans poids de corps.
- **Volume de répétitions** = Σ reps.
- **1RM estimé (Epley)** = `charge × (1 + reps / 30)`.
- **Intensité** = charge ÷ 1RM estimé (complétée par le RPE moyen).
- **Catégories de séries** (chacune dans une seule catégorie) :
  - **Force** : 1 à 3 reps
  - **Intermédiaire** : 4 à 6 reps
  - **Volume** : 7 à 12 reps (et au-delà de 12, classé aussi en « Volume »)
- Série à vide (0 kg) : charge 0, tonnage 0, mais reps comptées dans le volume de répétitions.

## 8. Modèle de données

- **Sport** : id, nom, type (force / combat), champs activés.
- **Exercice** : id, sport, nom.
- **Séance** : id, date, sport, statut (planifiée / faite), note, ressenti global.
- **Série** : séance, exercice, ordre, charge, reps, RPE, ressenti, repos, validée.
- **Cours BJJ** : séance, type, durée, ressenti, remarques, points à améliorer.
- **Technique** : cours, nom, tags, liens vidéo.
- **Tag** : id, nom, sport.
- **Modèle de séance** : nom, liste d'exercices et séries par défaut.
- **Objectif** : id, cible, valeur, échéance, atteint (oui/non), date d'atteinte.
- **Réglages** : thème.

## 9. Structure du projet proposée

```
suivi-sport/
├─ src/
│  ├─ pages/        Accueil, Séances, Stats, Objectifs, Réglages
│  ├─ components/   cartes, boutons +/−, anneaux, graphes, tags
│  ├─ db/           IndexedDB (stockage local) ; sync cloud plus tard
│  ├─ lib/          calculs (1RM, tonnage, intensité, catégories de reps)
│  ├─ theme/        clair/sombre, accent corail
│  └─ sports/       définitions (streetlifting, BJJ), extensible
├─ public/          manifest PWA, icônes, service worker
└─ .github/workflows/  déploiement GitHub Pages
```

## 10. Ordre de construction

1. Base PWA : projet Vite + React + TS, thème clair/sombre corail, navigation 4 onglets, stockage local (IndexedDB).
2. Séance streetlifting : saisie rapide, 1RM, cases à cocher.
3. Cours BJJ : notes, tags, liens vidéo, points à améliorer.
4. Accueil et planificateur avec modèles.
5. Stats (tonnage, volume, intensité, force/intermédiaire/volume, régularité).
6. Objectifs.
7. Export/Import JSON, déploiement GitHub Pages, installation sur iPhone.

## 11. Workflow et prochaines étapes

- Tim code avec VS Code + Claude Code et push sur GitHub (dépôt public `suivi-sport`).
- À vérifier : Git et Node.js (LTS) installés sur sa machine.
- Test sur iPhone : `npm run dev -- --host` pour un test réseau local ; l'installation PWA complète nécessite HTTPS, donc une fois publié sur GitHub Pages.
- Activer Pages dans les réglages du dépôt (source : GitHub Actions).

## 12. Phase 2 (hors MVP)

Comptes, synchro cloud (Supabase), partage avec d'autres personnes, autres sports, images d'exercices.
