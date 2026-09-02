/**
 * Serveur BAIQ — sert le build de production et relaie les appels à l'API Gemini.
 *
 * Pourquoi ce serveur ?
 * Dans une application 100% front-end, la clé API Gemini serait forcément intégrée
 * au code envoyé au navigateur (ou saisie par l'utilisateur et stockée en clair dans
 * localStorage), ce qui l'expose dans l'historique, les DevTools et tout journal réseau.
 * Ce petit serveur garde la clé côté serveur (variable d'environnement GEMINI_API_KEY)
 * et le navigateur ne parle jamais directement à Google — il appelle /api/gemini.
 *
 * Déploiement sur Render : créer un "Web Service" (et non un "Static Site"),
 * Build Command : npm install && npm run build
 * Start Command  : npm run start
 *
 * Variables d'environnement :
 *   - GEMINI_API_KEY              (requise pour les rapports IA)
 *   - UPSTASH_REDIS_REST_URL      (recommandée en production) stockage externe du
 *   - UPSTASH_REDIS_REST_TOKEN    compteur global d'analyses — voir le bloc de code
 *     dédié plus bas pour le détail. Survit à tous les redéploiements et redémarrages,
 *     contrairement au fichier local (ANALYSIS_COUNT_FILE, en repli si absentes).
 */
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Charge un fichier .env local si présent (développement uniquement).
// En production (Render, etc.), la variable GEMINI_API_KEY doit être définie
// directement dans les paramètres d'environnement de l'hébergeur.
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    if (!(key in process.env)) process.env[key] = val;
  }
}

const app = express();

// Nécessaire derrière un proxy inverse (Render, Heroku, etc.) pour que req.ip
// reflète la vraie IP du visiteur — sans cela, le rate limiting par IP ci-dessous
// verrait toutes les requêtes provenir de l'IP du proxy et deviendrait inefficace.
//
// La valeur est volontairement 1 (un seul proxy de confiance, celui de l'hébergeur)
// et non `true` : avec `true`, Express fait confiance à l'intégralité de la chaîne
// X-Forwarded-For, qu'un client peut forger. Un script pouvait alors présenter une
// fausse IP à chaque requête et traverser sans limite le plafond par IP ci-dessous.
app.set('trust proxy', 1);

app.use(express.json({ limit: '2mb' }));

const PORT = process.env.PORT || 8787;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// ── Whitelist des modèles autorisés à traverser le relais ──────────────────
// Empêche un appel direct à /api/gemini (hors navigateur, ex. curl/script) de
// demander un modèle arbitraire plus coûteux que ceux réellement utilisés par
// l'application.
const ALLOWED_GEMINI_MODELS = new Set([
  'gemini-2.0-flash',
  'gemini-2.0-flash-exp',
  'gemini-2.5-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
]);

// ── Garde-fou anti-abus côté serveur (rate limiting en mémoire) ────────────
// Les quotas affichés côté interface (1 rapport/dossier, 10 messages/dossier)
// sont uniquement déclaratifs : n'importe qui connaissant l'URL du relais
// pourrait sinon appeler /api/gemini sans limite et consommer le budget de la
// clé API. Ces deux fenêtres glissantes protègent la clé indépendamment de ce
// que fait le front-end.
//   - MAX_PAR_IP_PAR_HEURE : plafond par visiteur (anti-script isolé).
//   - MAX_GLOBAL_PAR_HEURE : plafond toutes IP confondues (anti-abus distribué,
//     protège le budget total même si l'IP source varie).
// Ajuster ces valeurs selon l'usage réel attendu de l'application.
const MAX_PAR_IP_PAR_HEURE = 15;
const MAX_GLOBAL_PAR_HEURE = 60;
const FENETRE_MS = 60 * 60 * 1000;

const appelsParIp = new Map();   // ip -> [timestamps]
let appelsGlobaux = [];          // [timestamps]

function purgerAnciens(liste, maintenant) {
  return liste.filter(t => maintenant - t < FENETRE_MS);
}

function rateLimitGemini(req, res, next) {
  const maintenant = Date.now();
  const ip = req.ip || req.connection?.remoteAddress || 'inconnu';

  appelsGlobaux = purgerAnciens(appelsGlobaux, maintenant);
  if (appelsGlobaux.length >= MAX_GLOBAL_PAR_HEURE) {
    return res.status(429).json({
      error: "Limite globale d'appels IA atteinte pour cette heure. Réessayez plus tard."
    });
  }

  const historiqueIp = purgerAnciens(appelsParIp.get(ip) || [], maintenant);
  if (historiqueIp.length >= MAX_PAR_IP_PAR_HEURE) {
    return res.status(429).json({
      error: "Trop d'appels IA depuis cette adresse pour cette heure. Réessayez plus tard."
    });
  }

  historiqueIp.push(maintenant);
  appelsParIp.set(ip, historiqueIp);
  appelsGlobaux.push(maintenant);
  next();
}

// ── Statut du relais (pour l'interface : savoir si Gemini est disponible sans exposer la clé) ──
app.get('/api/gemini/status', (req, res) => {
  res.json({ configured: Boolean(GEMINI_API_KEY) });
});

// ── Compteur global d'analyses lancées ──────────────────────────────────────
// Compte le nombre total d'analyses lancées sur l'application, TOUS visiteurs
// confondus (et non par navigateur/localStorage, qui repartirait de zéro pour
// chaque utilisateur). Persisté dans un fichier JSON, sans base de données —
// même principe de simplicité que le rate limiting en mémoire ci-dessus.
//
// ⚠️ EMPLACEMENT DU FICHIER EN PRODUCTION
// Par défaut, le fichier est écrit à côté de server.js. Sur un hébergeur dont le
// système de fichiers est éphémère (Render, Heroku...), ce répertoire est REMIS À
// ZÉRO à chaque redéploiement et à chaque redémarrage d'instance : le compteur
// public repartirait de zéro sans prévenir.
// Pour le conserver, attacher un disque persistant et définir la variable
// d'environnement ANALYSIS_COUNT_FILE sur un chemin situé dans ce disque, p. ex. :
//     ANALYSIS_COUNT_FILE=/var/data/analysis-count.json
// (sur Render : Disks → Add Disk, Mount Path /var/data).
//
// Limite connue : le compteur vit en mémoire et n'est vidé que dans ce fichier. Un
// déploiement à PLUSIEURS instances ferait diverger puis s'écraser les compteurs
// de chaque instance ; il faudrait alors un stockage partagé (Redis, Postgres).
const analysisCountPath = process.env.ANALYSIS_COUNT_FILE
  ? path.resolve(process.env.ANALYSIS_COUNT_FILE)
  : path.join(__dirname, 'analysis-count.json');

function readAnalysisCount() {
  try {
    const raw = fs.readFileSync(analysisCountPath, 'utf8');
    const parsed = JSON.parse(raw);
    return Number.isFinite(parsed.count) ? parsed.count : 0;
  } catch (err) {
    // Fichier absent = premier démarrage légitime, on part de 0 en silence.
    // Toute autre erreur (droits insuffisants, disque non monté, JSON corrompu)
    // signifie qu'un compteur existant est peut-être sur le point d'être écrasé
    // par un 0 : il faut que cela se voie dans les journaux.
    if (err?.code !== 'ENOENT') {
      console.error(
        `⚠ Compteur d'analyses illisible (${analysisCountPath}) : ${err?.message || err}\n` +
        "  Démarrage à 0 — si un compteur existait, il sera écrasé au prochain incrément."
      );
    }
    return 0;
  }
}

function writeAnalysisCount(count) {
  try {
    fs.mkdirSync(path.dirname(analysisCountPath), { recursive: true });
    // Écriture atomique : on écrit d'abord un fichier temporaire, puis on le renomme.
    // Un rename est atomique sur le même volume, si bien qu'une coupure en pleine
    // écriture ne peut pas laisser un JSON tronqué — qui serait ensuite illisible
    // et ramènerait le compteur à zéro.
    const tmp = `${analysisCountPath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify({ count }), 'utf8');
    fs.renameSync(tmp, analysisCountPath);
  } catch (err) {
    console.error('Impossible d\'écrire le compteur d\'analyses :', err?.message || err);
  }
}

// Le compteur est lu une seule fois au démarrage puis maintenu en mémoire.
// Auparavant, chaque incrément relisait puis réécrivait le fichier : la séquence
// n'étant pas atomique, deux requêtes simultanées perdaient un incrément, et chaque
// appel déclenchait une écriture disque synchrone.
// Plancher du compteur (ANALYSIS_COUNT_BASELINE).
//
// Sur un hébergeur SANS disque persistant — typiquement le plan gratuit de Render, où
// l'instance est détruite après une quinzaine de minutes d'inactivité — le fichier local
// disparaît très fréquemment et le compteur public retomberait à zéro plusieurs fois par
// jour. Ce plancher permet de repartir d'un total déjà atteint plutôt que de zéro.
//
// À n'ajuster QUE sur un total réellement observé : la valeur affichée reste ainsi un
// minorant honnête (« au moins N analyses lancées »), jamais un chiffre gonflé.
// La vraie solution reste un stockage partagé (disque persistant, Redis, Postgres) ;
// ce plancher n'est qu'un palliatif pour les hébergements éphémères.
//
// La valeur par défaut ci-dessous est un relevé daté, pas une constante : total constaté
// au 02/09/2026. Elle évite d'avoir à définir la variable sur l'hébergeur, mais elle se
// périme — la variable d'environnement ANALYSIS_COUNT_BASELINE reste prioritaire et permet
// de relever le plancher sans redéployer.
const BASELINE_CONSTATEE = 200; // relevé du 02/09/2026
const ANALYSIS_COUNT_BASELINE =
  Number.parseInt(process.env.ANALYSIS_COUNT_BASELINE || String(BASELINE_CONSTATEE), 10) || 0;

let analysisCount = Math.max(readAnalysisCount(), ANALYSIS_COUNT_BASELINE);
let ecritureDifferee = null;

// ── Stockage externe optionnel du compteur (Upstash Redis) ─────────────────
// Le fichier local ci-dessus ne survit à AUCUN redéploiement ni redémarrage sur le
// plan gratuit de Render — y compris un simple changement de variable d'environnement,
// qui efface le disque éphémère au même titre qu'un vrai déploiement de code. Le
// plancher ANALYSIS_COUNT_BASELINE n'est qu'un palliatif : il faut le relever à la main
// après chaque perte réelle.
//
// Upstash Redis (offre gratuite, API REST — aucune connexion TCP à gérer, un simple
// fetch() suffit) élimine le problème à la racine : le compteur vit hors du conteneur,
// il survit à tous les redéploiements et redémarrages.
//
// Entièrement optionnel : sans les deux variables ci-dessous, le comportement précédent
// (fichier local + plancher) reste strictement inchangé — et si Upstash est configuré
// mais temporairement injoignable, chaque appel se replie silencieusement sur ce même
// mécanisme local plutôt que de faire échouer la requête.
//   UPSTASH_REDIS_REST_URL   (ex: https://xxx-xxx-12345.upstash.io)
//   UPSTASH_REDIS_REST_TOKEN
const UPSTASH_URL = (process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/+$/, '');
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';
const UPSTASH_ACTIF = Boolean(UPSTASH_URL && UPSTASH_TOKEN);
const UPSTASH_CLE = 'baiq:analysis_count';

async function upstash(...commande) {
  const url = `${UPSTASH_URL}/${commande.map(encodeURIComponent).join('/')}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` } });
  if (!res.ok) throw new Error(`Upstash a répondu ${res.status}`);
  const { result } = await res.json();
  return result;
}

if (UPSTASH_ACTIF) {
  // SETNX : n'initialise la clé QUE si elle n'existe pas déjà côté Upstash — ne réécrase
  // jamais un total réel déjà accumulé, ne sert qu'à amorcer le tout premier démarrage
  // avec le plancher connu plutôt que de partir de zéro.
  upstash('SETNX', UPSTASH_CLE, String(ANALYSIS_COUNT_BASELINE)).catch(err => {
    console.error("⚠ Initialisation du compteur Upstash impossible :", err?.message || err);
  });
}

function planifierEcriture() {
  if (ecritureDifferee) return;
  ecritureDifferee = setTimeout(() => {
    ecritureDifferee = null;
    writeAnalysisCount(analysisCount);
  }, 5000);
  // N'empêche pas le processus de se terminer si c'est le seul minuteur actif.
  if (typeof ecritureDifferee.unref === 'function') ecritureDifferee.unref();
}

// Le compteur est affiché publiquement : sans plafond, une simple boucle pouvait le
// gonfler indéfiniment. Ce plafond est plus large que celui de l'IA (une analyse est
// une action légitimement répétable) mais ferme la porte à l'abus automatisé.
const MAX_INCREMENTS_PAR_IP_PAR_HEURE = 40;
const incrementsParIp = new Map();

function rateLimitCompteur(req, res, next) {
  const maintenant = Date.now();
  const ip = req.ip || req.connection?.remoteAddress || 'inconnu';
  const historique = purgerAnciens(incrementsParIp.get(ip) || [], maintenant);
  if (historique.length >= MAX_INCREMENTS_PAR_IP_PAR_HEURE) {
    // 200 volontaire : le compteur est décoratif, inutile de faire échouer l'interface.
    return res.json({ count: analysisCount });
  }
  historique.push(maintenant);
  incrementsParIp.set(ip, historique);
  next();
}

app.get('/api/analysis-count', async (req, res) => {
  if (UPSTASH_ACTIF) {
    try {
      const val = await upstash('GET', UPSTASH_CLE);
      const n = Number.parseInt(val, 10);
      if (Number.isFinite(n)) return res.json({ count: n });
    } catch (err) {
      console.error('Lecture Upstash échouée, repli sur le compteur local :', err?.message || err);
    }
  }
  res.json({ count: analysisCount });
});

app.post('/api/analysis-count/increment', rateLimitCompteur, async (req, res) => {
  if (UPSTASH_ACTIF) {
    try {
      const n = await upstash('INCR', UPSTASH_CLE);
      return res.json({ count: n });
    } catch (err) {
      console.error('Incrément Upstash échoué, repli sur le compteur local :', err?.message || err);
    }
  }
  analysisCount += 1;
  planifierEcriture();
  res.json({ count: analysisCount });
});

// Vide le compteur sur disque avant un arrêt propre (redéploiement, SIGTERM Render).
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    if (ecritureDifferee) clearTimeout(ecritureDifferee);
    writeAnalysisCount(analysisCount);
    process.exit(0);
  });
}

// ── Relais sécurisé vers l'API Gemini ──────────────────────────────────────
app.post('/api/gemini', rateLimitGemini, async (req, res) => {
  if (!GEMINI_API_KEY) {
    return res.status(503).json({
      error: "Clé API Gemini non configurée côté serveur. Définissez la variable d'environnement GEMINI_API_KEY sur votre hébergeur."
    });
  }

  const { modelName, body } = req.body || {};
  if (!modelName || !body) {
    return res.status(400).json({ error: 'Requête invalide : modelName et body sont requis.' });
  }
  if (!ALLOWED_GEMINI_MODELS.has(modelName)) {
    return res.status(400).json({ error: `Modèle non autorisé : ${modelName}.` });
  }

  try {
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY, // header plutôt que ?key= dans l'URL : moins de risque de fuite via logs/historique
        },
        body: JSON.stringify(body),
      }
    );
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    res.status(502).json({ error: 'Erreur de connexion au service Gemini.', detail: String(err?.message || err) });
  }
});

// ── Sert le build de production (npm run build → dist/) ───────────────────
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`BAIQ démarré sur le port ${PORT} ${GEMINI_API_KEY ? '(clé Gemini configurée ✓)' : '(⚠ GEMINI_API_KEY manquante — les rapports IA seront indisponibles)'}`);
});
