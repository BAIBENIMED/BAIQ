# BAIQ — Plateforme d'Analyse Financière SCF

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

#### Conserver le compteur global d'analyses

Le compteur affiché dans l'application est **global** (tous visiteurs confondus) : il est tenu
par le serveur, pas par le navigateur. Il est enregistré dans un fichier JSON.

Or **le système de fichiers de Render est éphémère** : il est remis à zéro à chaque
redéploiement et à chaque redémarrage d'instance. Sans la configuration ci-dessous, le compteur
public repart donc de zéro à chaque mise en ligne.

1. Onglet **Disks** → **Add Disk**, Mount Path : `/var/data` (1 Go suffit largement)
2. Onglet **Environment** → ajouter `ANALYSIS_COUNT_FILE=/var/data/analysis-count.json`

> ⚠️ Les disques Render ne sont disponibles que sur les plans payants, et un service muni d'un
> disque ne peut plus tourner qu'en **une seule instance**. C'est sans conséquence ici (le
> compteur est de toute façon tenu en mémoire par une instance unique), mais à garder en tête
> avant toute montée en charge : il faudrait alors un stockage partagé (Redis, Postgres).

**Sur le plan gratuit** (pas de disque disponible), l'instance est en outre mise en veille puis
détruite après une quinzaine de minutes d'inactivité — et un simple changement de variable
d'environnement provoque le même effacement, au même titre qu'un vrai déploiement de code. Le
fichier local disparaît donc très fréquemment.

#### Vraie persistance, gratuite : Upstash Redis (recommandé)

`server.js` sait déjà s'en servir — il suffit de créer la base et de renseigner deux variables,
aucune ligne de code à toucher.

1. Créer un compte sur [upstash.com](https://upstash.com) (gratuit, aucune carte requise)
2. **Create Database** → type **Redis**, plan **Free**, choisir une région
3. Dans la page de la base, section **REST API**, copier les deux valeurs :
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
4. Sur Render, onglet **Environment** du service `baiq`, ajouter ces deux variables avec les
   valeurs copiées

Une fois les deux variables présentes, le compteur bascule automatiquement sur Upstash — il
survit dès lors à tous les redéploiements et redémarrages, plus besoin de relever un plancher à
la main. Si Upstash devient temporairement injoignable, le serveur se replie silencieusement sur
le mécanisme local ci-dessous (jamais d'erreur visible pour l'utilisateur).

#### Sans Upstash : palliatif sans coût déjà en place

Un plancher est codé en dur dans `server.js` (`BASELINE_CONSTATEE`, relevé daté). Le compteur
repart de cette valeur au lieu de zéro à chaque réveil de l'instance. Pour le relever **sans
redéployer**, définir la variable `ANALYSIS_COUNT_BASELINE` sur l'hébergeur : elle est prioritaire
sur la valeur du code. À n'ajuster que sur un total réellement observé — le nombre affiché reste
ainsi un minorant honnête, jamais un chiffre gonflé. Pensez à le relever de temps en temps, sinon
il se périme à chaque redéploiement.

Dans tous les cas, l'application fonctionne normalement sans aucune de ces options — seul le
compteur se réinitialise.

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
