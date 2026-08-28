# Finanalyze (BAIQ) — Plateforme d'Analyse Financière SCF Algérie

Application d'analyse comptable et financière (Bilan, SIG, Ratios, Solvabilité, Audit de balance)
conforme au Système Comptable Financier (SCF, Loi 07-11), avec assistant IA optionnel (Google Gemini).

## Développement local

```bash
npm install
npm run dev
```

Cette commande lance en parallèle :
- **Vite** (interface, port 5173)
- **le serveur API** (`server.js`, port 8787) qui relaie les appels à l'API Gemini

Sans lancer le serveur API séparément, l'interface fonctionne normalement mais l'Assistant IA
utilisera uniquement le moteur local (ou une clé Gemini saisie manuellement dans Paramètres, moins sûr).

### Assistant IA (Google Gemini) — optionnel

Pour activer l'IA Gemini de façon sécurisée (clé jamais exposée au navigateur) :

1. Obtenez une clé API sur [aistudio.google.com](https://aistudio.google.com)
2. Copiez `.env.example` en `.env` à la racine du projet
3. Renseignez `GEMINI_API_KEY=votre_clé` dans `.env`
4. Relancez `npm run dev`

Sans cette configuration, l'application reste pleinement fonctionnelle : les calculs financiers,
ratios, exports PDF/Excel et l'audit de balance ne dépendent d'aucune IA externe.

## Déploiement en production

Cette application n'est **plus un simple site statique** : `server.js` sert le build ET relaie les
appels Gemini en gardant la clé API côté serveur. Il faut donc déployer un **service web** (pas un
"Static Site").

### Sur Render.com

1. **New +** → **Web Service** (et non "Static Site")
2. Connecter le dépôt GitHub
3. Build Command : `npm install && npm run build`
4. Start Command : `npm run start`
5. Dans l'onglet **Environment**, ajouter la variable `GEMINI_API_KEY` avec votre clé
6. Créer le service

### Sur tout autre hébergeur Node (Railway, Fly.io, VPS, etc.)

```bash
npm install
npm run build
GEMINI_API_KEY=votre_clé npm run start
```

Le serveur écoute sur `process.env.PORT` (ou 8787 par défaut) et sert à la fois l'application
et l'endpoint `/api/gemini`.

## Confidentialité

Lorsque l'Assistant IA ou la génération de rapports Gemini sont utilisés, les données du dossier
actif (montants du bilan, du compte de résultat, ratios) sont transmises à l'API Google Gemini.
Le reste de l'application (calculs, ratios, exports PDF/Excel, audit de balance) fonctionne
entièrement côté client, sans transmission de données à un tiers.
