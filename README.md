# Suivi Sport

PWA de suivi **streetlifting** et **jiu-jitsu brésilien**, locale d'abord (IndexedDB), installable sur iPhone. Spécification complète : [SPEC.md](SPEC.md).

## Démarrer

Prérequis : Node.js LTS (≥ 22).

```bash
npm install
npm run dev            # http://localhost:5173
npm run dev -- --host  # test depuis l'iPhone sur le même Wi-Fi
npm test               # tests des calculs (1RM, tonnage, catégories)
npm run build          # build de production dans dist/
npm run preview        # teste ce build tel qu'il sera publié : http://localhost:4173/Sport-tracking/
```

## Déploiement (GitHub Pages)

1. Pousser `main` sur le dépôt GitHub (`Sport-tracking`, public).
2. Dans *Settings → Pages*, choisir la source **GitHub Actions**.
3. Chaque push sur `main` déploie sur `https://timothierry-oss.github.io/Sport-tracking/`.
4. Sur l'iPhone : ouvrir l'URL dans Safari → *Partager* → *Sur l'écran d'accueil*.

Si le dépôt porte un autre nom, adapter `base` dans [vite.config.ts](vite.config.ts).

## Organisation

```
src/
├─ pages/       Accueil, Séances, éditeurs (streetlifting, BJJ, modèle), Stats, Objectifs, Réglages
├─ components/  UI (pilules, steppers, anneaux, feuilles), graphes Recharts
├─ db/          schéma Dexie (IndexedDB), actions, export/import JSON
├─ lib/         calculs (Epley, tonnage, catégories), agrégations, dates
├─ theme/       thème clair/sombre, accent corail
└─ sports/      définitions des sports (ajouter un sport = une entrée)
```

Les données restent sur l'appareil : penser à **Réglages → Exporter** régulièrement.

Couleurs des graphes : corail / bleu / vert, validées pour le daltonisme en clair et en sombre (les barres empilées ont un liseré de séparation, une légende et un tableau).
