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
 * Variable d'environnement à définir : GEMINI_API_KEY
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
app.set('trust proxy', true);

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
// chaque utilisateur). Persisté dans un fichier JSON local pour survivre aux
// redémarrages du serveur — même principe de simplicité que le rate limiting
// en mémoire ci-dessus, sans base de données dédiée.
const analysisCountPath = path.join(__dirname, 'analysis-count.json');

function readAnalysisCount() {
  try {
    const raw = fs.readFileSync(analysisCountPath, 'utf8');
    const parsed = JSON.parse(raw);
    return Number.isFinite(parsed.count) ? parsed.count : 0;
  } catch {
    return 0;
  }
}

function writeAnalysisCount(count) {
  try {
    fs.writeFileSync(analysisCountPath, JSON.stringify({ count }), 'utf8');
  } catch (err) {
    console.error('Impossible d\'écrire le compteur d\'analyses :', err?.message || err);
  }
}

app.get('/api/analysis-count', (req, res) => {
  res.json({ count: readAnalysisCount() });
});

app.post('/api/analysis-count/increment', (req, res) => {
  const count = readAnalysisCount() + 1;
  writeAnalysisCount(count);
  res.json({ count });
});

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
